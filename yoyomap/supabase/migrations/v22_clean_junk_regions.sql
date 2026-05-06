-- =============================================================================
-- v22: Clean up junk region names and prevent re-introduction
-- =============================================================================
-- Why this exists:
--   - Some legacy entries had numeric / single-character / whitespace-only
--     strings written into entries.region (e.g. the literal text "23"). The v13
--     backfill happily seeded those into public.regions, and the v17 sync
--     trigger keeps re-resolving them on every entry update — so the public
--     map_entries view shows broken region names like "23" for affected rows.
--   - Public symptom: pages such as
--         /en/players/united-states/23
--     render with the heading "Yo-Yo Players in 23" and "23" as the region
--     column in the directory.
--
-- What this migration does:
--   1. Identifies junk region rows (NULL, empty, whitespace-only, length < 2,
--      pure-digits, or pure punctuation).
--   2. For every entry pointing at a junk region, NULLs out region_id and
--      replaces the region text with NULL — which the trigger will treat as
--      "unspecified region" on the next sync. This routes affected entries to
--      the existing "_other" unspecified-region page rather than a broken slug.
--   3. Removes any cities that were attached to junk regions (re-parented to
--      country-level, region_id = NULL, dedup-aware).
--   4. Deletes the junk region rows themselves.
--   5. Adds a CHECK constraint on public.regions.name so the same class of
--      garbage can never be re-inserted by the trigger or by future backfills.
--
-- What this migration deliberately does NOT do:
--   - It does not try to guess the correct region for an affected entry. Doing
--     so would silently move someone's pin into the wrong state. Routing them
--     to the unspecified-region page is the conservative, recoverable choice;
--     the user can re-submit or an admin can correct by hand.
--
-- Safe to re-run: yes (all steps are idempotent / no-op on a clean DB).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Disable the v17 sync trigger for the duration of this migration so our
--    bulk UPDATE on entries.region doesn't fight us by re-resolving region_id
--    against rows we're about to delete.
-- ---------------------------------------------------------------------------
alter table public.entries disable trigger entries_sync_location_fks;

-- ---------------------------------------------------------------------------
-- 1. Identify junk regions.
--    Definition of "junk" for region.name:
--      - NULL or empty after trim
--      - shorter than 2 visible characters
--      - matches ^[0-9]+$  (pure digits, e.g. "23")
--      - matches ^[[:punct:][:space:]]+$  (pure punctuation / whitespace)
-- ---------------------------------------------------------------------------
create temporary table tmp_junk_regions on commit drop as
select id
from public.regions
where
     name is null
  or length(btrim(name)) < 2
  or btrim(name) ~ '^[0-9]+$'
  or btrim(name) ~ '^[[:punct:][:space:]]+$';

-- ---------------------------------------------------------------------------
-- 2. Repoint affected entries to "no region".
--    The v17 trigger, once re-enabled, will keep region_id NULL because
--    region text is NULL.
-- ---------------------------------------------------------------------------
update public.entries e
set
  region    = null,
  region_id = null
where e.region_id in (select id from tmp_junk_regions);

-- ---------------------------------------------------------------------------
-- 3. Re-parent cities that hung off junk regions.
--    A city under a junk region becomes a country-level city (region_id NULL)
--    if that slot is free; otherwise we collapse onto the existing duplicate
--    and repoint any entries that used the old city.
-- ---------------------------------------------------------------------------
create temporary table tmp_orphan_cities on commit drop as
select id, country_id, name
from public.cities
where region_id in (select id from tmp_junk_regions);

-- 3a. For each orphan city, find an existing country-level city with the same
--     (country_id, lower(name)). If found, redirect entries to it; otherwise
--     just NULL the orphan's region_id.
with redirect_map as (
  select
    o.id          as old_city_id,
    coalesce(
      (
        select ci.id
        from public.cities ci
        where ci.country_id = o.country_id
          and ci.region_id  is null
          and lower(ci.name) = lower(o.name)
        limit 1
      ),
      o.id
    ) as new_city_id
  from tmp_orphan_cities o
)
update public.entries e
set city_id = rm.new_city_id
from redirect_map rm
where e.city_id = rm.old_city_id
  and rm.old_city_id <> rm.new_city_id;

-- 3b. Delete orphan cities that have been redirected to an existing country-
--     level duplicate (no entries should reference them anymore).
delete from public.cities ci
where ci.id in (select id from tmp_orphan_cities)
  and exists (
    select 1
    from public.cities other
    where other.country_id = ci.country_id
      and other.region_id  is null
      and lower(other.name) = lower(ci.name)
      and other.id <> ci.id
  );

-- 3c. For any remaining orphans (no duplicate existed), promote them to
--     country-level by clearing region_id.
update public.cities ci
set region_id = null
where ci.id in (select id from tmp_orphan_cities)
  and ci.region_id is not null;

-- ---------------------------------------------------------------------------
-- 4. Delete the junk region rows.
-- ---------------------------------------------------------------------------
delete from public.regions
where id in (select id from tmp_junk_regions);

-- ---------------------------------------------------------------------------
-- 5. Re-enable the sync trigger.
-- ---------------------------------------------------------------------------
alter table public.entries enable trigger entries_sync_location_fks;

-- ---------------------------------------------------------------------------
-- 6. Add a CHECK constraint so the v17 trigger / future backfills can never
--    re-introduce this class of junk.
--    Permissive on purpose: allows any 2+ character name that isn't pure
--    digits or pure punctuation. Real region names worldwide (Cyrillic, CJK,
--    accented Latin) all pass.
-- ---------------------------------------------------------------------------
alter table public.regions
  drop constraint if exists regions_name_not_junk;

alter table public.regions
  add constraint regions_name_not_junk
  check (
    name is not null
    and length(btrim(name)) >= 2
    and btrim(name) !~ '^[0-9]+$'
    and btrim(name) !~ '^[[:punct:][:space:]]+$'
  );

commit;

-- =============================================================================
-- Diagnostics — run after migration to confirm cleanup.
-- Expected: zero rows from each of these.
-- =============================================================================
-- select id, country_id, code, name from public.regions
--   where name is null
--      or length(btrim(name)) < 2
--      or btrim(name) ~ '^[0-9]+$'
--      or btrim(name) ~ '^[[:punct:][:space:]]+$';
--
-- select id, display_name, country, region, city
-- from public.entries
-- where region ~ '^[0-9]+$'
--   and deleted_at is null;
