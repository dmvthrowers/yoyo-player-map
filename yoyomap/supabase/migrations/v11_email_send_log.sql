-- =============================================================================
-- Short-window dedup log for outbound email. Prevents rapid repeat sends
-- (double-submits, re-request magic links, cron reminder overlaps) from
-- burning Resend's 100/day free-tier cap.
--
-- We record every successful send keyed by (to_email, template) with a unique
-- constraint scoped to a short window via last_sent_at. Callers check this
-- table before hitting Resend and bail if a matching row is fresh.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.email_send_log (
  id            bigserial PRIMARY KEY,
  to_email      text        NOT NULL,
  template      text        NOT NULL,
  last_sent_at  timestamptz NOT NULL DEFAULT now()
);

-- One row per (to_email, template) — we UPSERT on send and bump last_sent_at.
CREATE UNIQUE INDEX IF NOT EXISTS email_send_log_to_template_uniq
  ON public.email_send_log (to_email, template);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only.
