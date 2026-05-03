-- =============================================================================
-- v16: Enforce NOT NULL on location FK columns
-- =============================================================================
-- v12 added country_id and city_id as nullable pending full backfill.
-- All 214 active entries now have both columns populated, so we can
-- enforce the constraint. region_id stays nullable (not all countries
-- use a sub-national region concept).
-- =============================================================================

ALTER TABLE public.entries ALTER COLUMN country_id SET NOT NULL;
ALTER TABLE public.entries ALTER COLUMN city_id    SET NOT NULL;
