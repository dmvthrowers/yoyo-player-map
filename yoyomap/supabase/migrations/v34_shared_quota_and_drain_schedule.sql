-- =============================================================================
-- v34: Account-wide email usage + a 5-minute queue drain
-- =============================================================================
--
-- The Resend account (100 emails/UTC day) is shared with the VSYC
-- registration app. Every send response carries x-resend-daily-quota, the
-- whole account's usage today, so the app records the higher of that and its
-- own count. That keeps the budget honest about the other app's sends.
--
-- The drain job runs every 5 minutes but only calls the app when a row is due,
-- so an empty queue costs nothing. Resend's 10 req/s limit is respected by the
-- app itself, which paces drain sends at 2/second.
--
-- One-time setup (not in this file, because it holds a secret): store the
-- app's CRON_SECRET in Vault under the name map_cron_secret:
--
--   select vault.create_secret('<CRON_SECRET value>', 'map_cron_secret');
--
-- Until that secret exists the job's calls are rejected with 401, which is
-- harmless: Vercel's 00:05 UTC cron and the after-send drain still run.
-- =============================================================================

-- Raise today's count to what Resend reports, never lower it.
CREATE OR REPLACE FUNCTION public.observe_email_usage(p_used int)
RETURNS int
LANGUAGE sql
SET search_path = ''
AS $$
  INSERT INTO public.email_daily_usage AS u (day, sent)
  VALUES ((now() AT TIME ZONE 'utc')::date, p_used)
  ON CONFLICT (day) DO UPDATE SET sent = GREATEST(u.sent, EXCLUDED.sent)
  RETURNING u.sent;
$$;

REVOKE ALL ON FUNCTION public.observe_email_usage(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.observe_email_usage(int) TO service_role;

-- cron.schedule replaces an existing job with the same name.
SELECT cron.schedule(
  'drain-email-queue',
  '*/5 * * * *',
  $job$
    SELECT net.http_post(
      url := 'https://map.dmvthrowers.club/api/admin/drain-email-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(
          (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'map_cron_secret'), '')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    )
    WHERE EXISTS (
      SELECT 1 FROM public.email_queue
       WHERE sent_at IS NULL
         AND dead_at IS NULL
         AND not_before <= now()
         AND (claimed_at IS NULL OR claimed_at < now() - interval '5 minutes')
    );
  $job$
);
