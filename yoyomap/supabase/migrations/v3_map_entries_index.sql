-- =============================================================================
-- Partial index for map_entries view
-- =============================================================================
-- The map_entries view filters entries by four boolean/null conditions on
-- every call. This partial index matches that WHERE clause exactly so
-- Postgres can satisfy the view with an index scan over only the visible
-- subset, avoiding a seq scan + filter evaluation on each query.
--
-- Ordering by created_at DESC gives free ordering for any "newest first"
-- sort without an extra sort step.
-- =============================================================================

CREATE INDEX idx_entries_visible
  ON entries (created_at)
  WHERE is_visible = true
    AND is_flagged = false
    AND deleted_at IS NULL
    AND auto_hidden_by_reports = false;
