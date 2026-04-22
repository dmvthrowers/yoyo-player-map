-- =============================================================================
-- Add missing covering indexes for foreign keys
-- =============================================================================
-- The Supabase linter flagged these FK columns as unindexed, even though they
-- are declared in schema.sql. The live database appears to be missing them
-- (likely due to partial application of schema.sql or a dropped index).
--
-- These indexes speed up:
--   - Joins from reports/verification_tokens back to their parent entry
--   - FK validation during DELETE/UPDATE on public.entries (the ON DELETE
--     CASCADE action needs to find matching child rows)
--   - Common app queries like "tokens for this entry" and "reports for this
--     entry"
-- =============================================================================

CREATE INDEX IF NOT EXISTS reports_entry_idx
  ON public.reports (entry_id);

CREATE INDEX IF NOT EXISTS verification_tokens_entry_idx
  ON public.verification_tokens (entry_id);
