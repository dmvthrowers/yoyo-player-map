-- =============================================================================
-- Optimize RLS policy: wrap auth.jwt() in a scalar subquery
-- =============================================================================
-- The "users read their own entry" policy called auth.jwt() directly, which
-- Postgres re-evaluates for every row scanned. Wrapping it in (select ...)
-- makes it an initPlan so the value is computed once per statement and reused
-- across all rows — much cheaper at scale.
--
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- =============================================================================

DROP POLICY IF EXISTS "users read their own entry" ON public.entries;

CREATE POLICY "users read their own entry"
  ON public.entries FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()) ->> 'email' = email::text);
