-- =============================================================================
-- v19: Add explicit deny-all RLS policies on email_queue and email_send_log
-- =============================================================================
-- Both tables have RLS enabled but no policies, which triggers the Supabase
-- "rls_enabled_no_policy" linter warning (lint 0008).  These tables are
-- intentionally server-only: all reads and writes use the service-role client,
-- which bypasses RLS entirely.  Adding USING (false) policies makes the intent
-- explicit and resolves the linter warning without changing runtime behaviour.
-- =============================================================================

CREATE POLICY "email_queue_no_direct_access"
  ON public.email_queue
  FOR ALL
  USING (false);

CREATE POLICY "email_send_log_no_direct_access"
  ON public.email_send_log
  FOR ALL
  USING (false);
