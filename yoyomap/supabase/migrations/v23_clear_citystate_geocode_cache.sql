-- =============================================================================
-- v23: Clear poisoned geocode_cache entries for city-state queries and
--      reset affected entries for re-geocoding.
--
-- Background:
--   Before commit 58633fe, Nominatim results for city-states (Berlin, Hamburg,
--   etc.) were not recognized because "administrative" was absent from the
--   accepted addresstype set.  When no acceptable hit was found, the old
--   permissive fallback accepted ANY result — including streets like
--   "Berlinstraße, Fürth" — landing those players in Nuremberg.
--
--   The code was fixed in 58633fe, but cached bad results survive in
--   public.geocode_cache and are served before any live Nominatim call.
--   Additionally, the freeform fallback used featuretype=city which also
--   excludes administrative results; that is fixed alongside this migration.
--
-- What this migration does:
--   1. Deletes geocode_cache 'city' entries whose stored coordinates fall
--      inside the Nuremberg metropolitan area — the known wrong result.
--   2. Deletes geocode_cache 'city' entries where the cached city name is
--      a known wrong value (Nuremberg / Nürnberg / Fürth / Erlangen).
--   3. Resets geocoded_at to NULL for entries in Berlin, Germany whose
--      coordinates currently fall in the Nuremberg area, so the next
--      admin re-geocode run re-places them correctly.
--
-- Safe to re-run: yes (DELETE / UPDATE are no-ops on a clean DB).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Clear geocode_cache rows whose result points to Nuremberg.
--    Bounding box: lat 49.2–49.7, lng 10.7–11.4 covers the Nuremberg metro.
-- ---------------------------------------------------------------------------
delete from public.geocode_cache
where query_kind = 'city'
  and (
    (
      (result->>'lat')::float between 49.2 and 49.7
      and (result->>'lng')::float between 10.7 and 11.4
    )
    or lower(result->>'city') in ('nuremberg', 'nürnberg', 'fürth', 'erlangen', 'schwabach')
  );

-- ---------------------------------------------------------------------------
-- 2. Reset geocoded_at for Berlin entries that have Nuremberg-area coordinates
--    so the regeocode-all job re-places them on the next admin run.
-- ---------------------------------------------------------------------------
update public.entries
set geocoded_at = null
where deleted_at is null
  and lower(city)    = 'berlin'
  and lower(country) = 'de'
  and lat between 49.2 and 49.7
  and lng between 10.7 and 11.4;

commit;

-- =============================================================================
-- Diagnostics — run after migration to verify cleanup.
-- Expected: zero rows from each query.
-- =============================================================================
-- select query_hash, result->>'city', result->>'lat', result->>'lng'
-- from public.geocode_cache
-- where query_kind = 'city'
--   and (result->>'lat')::float between 49.2 and 49.7
--   and (result->>'lng')::float between 10.7 and 11.4;
--
-- select id, display_name, city, region, country, lat, lng
-- from public.entries
-- where lower(city) = 'berlin' and lower(country) = 'de'
--   and lat between 49.2 and 49.7 and lng between 10.7 and 11.4
--   and deleted_at is null;
