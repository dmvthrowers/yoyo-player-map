-- =============================================================================
-- v18: Fix map_entries performance regression introduced by v17
-- =============================================================================
-- v17 updated map_entries to JOIN entries → countries / regions / cities, but
-- left two gaps that cause Warp "Thread killed by timeout manager" bursts:
--
--   1. Missing GRANT SELECT on lookup tables for anon / authenticated.
--      map_entries runs with security_invoker = true (Supabase default).
--      Postgres therefore checks the *caller's* privileges on every joined
--      table.  entries was already granted (v14), but countries / regions /
--      cities were not, so anon queries to map_entries hit permission errors
--      that pile up in the PostgREST connection pool and exhaust it.
--
--   2. Missing FK indexes on entries.country_id / region_id / city_id.
--      After the partial-index scan (idx_entries_visible), Postgres must do
--      a heap fetch per row to get the join-key values.  This is unnecessary
--      I/O on every map read and makes the planner's cardinality estimates
--      worse.
--
-- Fixes applied here:
--   A. GRANT SELECT on the three lookup tables.
--   B. FK indexes on entries (country_id, region_id, city_id).
--   C. Rebuild idx_entries_visible as a covering index (INCLUDE country_id,
--      region_id, city_id) so map_entries JOINs need zero heap round-trips
--      for those columns.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A. Grant public read access to the location lookup tables.
-- ---------------------------------------------------------------------------
-- These tables contain only public, non-sensitive data (country codes, region
-- names, city names).  The privacy gate is the RLS policy on entries itself.
-- No RLS is needed on the lookup tables; the data is intentionally public.
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.countries TO anon, authenticated;
GRANT SELECT ON public.regions   TO anon, authenticated;
GRANT SELECT ON public.cities    TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- B. FK indexes on entries (country_id, region_id, city_id).
-- ---------------------------------------------------------------------------
-- country_id and city_id are NOT NULL (v16); region_id is nullable.
-- These satisfy the Supabase unindexed-FK linter and let the planner choose
-- efficient nested-loop or merge join plans when filtering by location.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS entries_country_id_idx
  ON public.entries (country_id);

CREATE INDEX IF NOT EXISTS entries_region_id_idx
  ON public.entries (region_id);

CREATE INDEX IF NOT EXISTS entries_city_id_idx
  ON public.entries (city_id);

-- ---------------------------------------------------------------------------
-- C. Rebuild idx_entries_visible as a covering index.
-- ---------------------------------------------------------------------------
-- The new INCLUDE clause lets Postgres satisfy the FK JOIN keys directly from
-- the index without fetching the heap row.  The WHERE predicate is identical
-- so every query that matched the old index also matches the new one.
-- DROP the old index first so we don't carry two overlapping partial indexes.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_entries_visible;

CREATE INDEX idx_entries_visible
  ON public.entries (created_at DESC)
  INCLUDE (id, country_id, region_id, city_id)
  WHERE is_visible             = true
    AND is_flagged             = false
    AND deleted_at             IS NULL
    AND auto_hidden_by_reports = false;
