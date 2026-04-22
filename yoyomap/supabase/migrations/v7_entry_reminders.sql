-- =============================================================================
-- Track email-verification reminders sent to entry owners
-- =============================================================================
-- Owners who submit an entry must click a verification link before their entry
-- becomes visible. These columns let us (a) rate-limit reminder emails so we
-- don't spam people and (b) cap the total number of reminders per entry.
-- =============================================================================

ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count   int NOT NULL DEFAULT 0;

-- Partial index for the daily reminder job: only unverified, non-deleted rows.
CREATE INDEX IF NOT EXISTS entries_unverified_idx
  ON public.entries (last_reminder_at NULLS FIRST)
  WHERE verified_at IS NULL AND deleted_at IS NULL;
