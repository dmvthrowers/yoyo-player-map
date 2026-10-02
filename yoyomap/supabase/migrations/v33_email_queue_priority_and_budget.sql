-- =============================================================================
-- v33: Email queue priority, row claiming, dead-lettering, and a daily budget
-- =============================================================================
--
-- Resend's free tier allows 100 emails per UTC day (inbound mail counts too)
-- and resets at 00:00 UTC. v9's queue retried 429s but had gaps:
--
--   * Two drains running at once (cron + admin) read the same rows and could
--     send the same email twice. claim_email_queue() now claims rows with
--     FOR UPDATE SKIP LOCKED so each row goes to exactly one drain.
--   * Rows that kept failing were retried forever. dead_at marks a row as
--     given up (too many attempts, or its link expired before it could go out).
--   * Every email had equal priority, so the 10:00 UTC reminder cron could
--     spend the whole day's quota before anyone signed up. priority orders
--     the drain (0 = someone is waiting on it, 1 = admin alert, 2 = bulk), and
--     email_daily_usage lets the app hold back a reserve for priority 0.
--   * expires_at lets the drain skip an email whose link has already expired
--     instead of spending quota on a dead link.
--
-- All of this stays service-role only, like email_queue and email_send_log.
-- =============================================================================

ALTER TABLE public.email_queue
  ADD COLUMN IF NOT EXISTS priority   smallint    NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dead_at    timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Drain order: highest priority first, then oldest not_before. A new index
-- name rather than replacing v9's email_queue_drain_idx, which stays (still
-- valid for its own queries, and the table is small).
CREATE INDEX IF NOT EXISTS email_queue_priority_drain_idx
  ON public.email_queue (priority, not_before)
  WHERE sent_at IS NULL AND dead_at IS NULL;

-- ---------------------------------------------------------------------------
-- Claim up to p_limit due rows for one drain run. A claim older than
-- 5 minutes is treated as abandoned (the function that held it timed out).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_email_queue(p_limit int)
RETURNS SETOF public.email_queue
LANGUAGE sql
SET search_path = ''
AS $$
  UPDATE public.email_queue q
     SET claimed_at = now()
   WHERE q.id IN (
     SELECT id
       FROM public.email_queue
      WHERE sent_at IS NULL
        AND dead_at IS NULL
        AND not_before <= now()
        AND (claimed_at IS NULL OR claimed_at < now() - interval '5 minutes')
      ORDER BY priority, not_before
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED
   )
  RETURNING q.*;
$$;

REVOKE ALL ON FUNCTION public.claim_email_queue(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_queue(int) TO service_role;

-- ---------------------------------------------------------------------------
-- Emails accepted by Resend per UTC day, matching Resend's quota window.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_daily_usage (
  day  date PRIMARY KEY,
  sent int  NOT NULL DEFAULT 0
);

ALTER TABLE public.email_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_daily_usage_no_direct_access"
  ON public.email_daily_usage
  FOR ALL
  USING (false);

REVOKE ALL ON public.email_daily_usage FROM anon, authenticated;
COMMENT ON TABLE public.email_daily_usage IS E'@graphql({"expose": false})';

-- Add p_count to today's total and return the new total.
CREATE OR REPLACE FUNCTION public.record_email_send(p_count int DEFAULT 1)
RETURNS int
LANGUAGE sql
SET search_path = ''
AS $$
  INSERT INTO public.email_daily_usage AS u (day, sent)
  VALUES ((now() AT TIME ZONE 'utc')::date, p_count)
  ON CONFLICT (day) DO UPDATE SET sent = u.sent + EXCLUDED.sent
  RETURNING u.sent;
$$;

REVOKE ALL ON FUNCTION public.record_email_send(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_email_send(int) TO service_role;
