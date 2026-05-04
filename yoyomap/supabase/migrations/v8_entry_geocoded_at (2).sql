-- =============================================================================
-- Track when each entry's coordinates were last geocoded
-- =============================================================================
-- Used by the bulk re-geocode admin task so it can resume across runs and
-- avoid redoing work. NULL means "never processed by the backfill" — the
-- bulk job picks those up first.
-- =============================================================================

ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;

CREATE INDEX IF NOT EXISTS entries_geocoded_at_idx
  ON public.entries (geocoded_at NULLS FIRST)
  WHERE deleted_at IS NULL;
