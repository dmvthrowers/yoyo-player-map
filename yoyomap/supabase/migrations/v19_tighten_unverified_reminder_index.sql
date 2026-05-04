-- =============================================================================
-- v19: Address Supabase unused-index linter findings
-- =============================================================================
-- The Supabase linter flagged four indexes as never-used in pg_stat_user_indexes.
-- This is expected on a fresh or recently-reset database where the queries that
-- exercise those indexes have not run yet.  Three of the four require no action:
--
--   idx_entries_visible   – every public map read goes through this covering
--                           index; it was just rebuilt in v18.
--
--   email_queue_drain_idx – drainEmailQueue() scans this when Resend returns
--                           429 or hits the daily quota; only fires when emails
--                           actually queue up.
--
--   reports_entry_idx     – Postgres uses this internally for FK CASCADE when
--                           an entry is hard-deleted; the table is intentionally
--                           write-heavy (inserts, not lookups).
--
-- The fourth index, entries_unverified_idx, has a predicate mismatch with the
-- query it supports:
--
--   Index predicate   : WHERE verified_at IS NULL AND deleted_at IS NULL
--   Actual query      : WHERE verified_at IS NULL AND deleted_at IS NULL
--                             AND reminder_count < 3        ← not in predicate
--
-- Adding reminder_count < 3 to the predicate tightens the working set and
-- improves selectivity: once an entry reaches the cap it is no longer in the
-- index and incurs no maintenance overhead.
--
-- The accompanying change to send-reminders/route.ts adds:
--   .order('last_reminder_at', { ascending: true, nullsFirst: true })
-- so the query's ORDER BY matches the index key, letting Postgres satisfy
-- both the filter and the sort from the index without a separate sort step.
-- Entries that have never been reminded (NULL) are processed first, followed
-- by those whose last reminder was longest ago — the most correct behaviour.
--
-- NOTE: The reminder_count < 3 predicate mirrors MAX_REMINDERS_PER_ENTRY in
-- lib/reminders.ts.  If that constant is increased, drop and recreate this
-- index with the updated value.
-- =============================================================================

DROP INDEX IF EXISTS public.entries_unverified_idx;

CREATE INDEX entries_unverified_idx
  ON public.entries (last_reminder_at NULLS FIRST)
  WHERE verified_at  IS NULL
    AND deleted_at   IS NULL
    AND reminder_count < 3;
