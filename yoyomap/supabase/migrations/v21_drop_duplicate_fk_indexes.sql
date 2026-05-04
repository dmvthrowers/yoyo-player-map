-- =============================================================================
-- v21: Drop duplicate FK indexes on entries (city_id, region_id, country_id)
-- =============================================================================
-- The Supabase linter flagged three pairs of identical indexes on public.entries:
--
--   entries_city_id_idx    ↔  idx_entries_city_id     (both index entries.city_id)
--   entries_country_id_idx ↔  idx_entries_country_id  (both index entries.country_id)
--   entries_region_id_idx  ↔  idx_entries_region_id   (both index entries.region_id)
--
-- The entries_*_idx variants were created intentionally by v18 with canonical
-- naming.  The idx_entries_* variants were created outside of migrations and
-- are redundant.  Drop the idx_entries_* duplicates to eliminate the wasted
-- storage and maintenance overhead.
-- =============================================================================

DROP INDEX IF EXISTS public.idx_entries_city_id;
DROP INDEX IF EXISTS public.idx_entries_country_id;
DROP INDEX IF EXISTS public.idx_entries_region_id;
