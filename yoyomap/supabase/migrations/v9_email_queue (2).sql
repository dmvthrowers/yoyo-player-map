-- =============================================================================
-- Queue for emails that couldn't be sent immediately (Resend 429 throttle or
-- daily-quota cap). A background drain job re-attempts each row once its
-- not_before timestamp has passed.
-- =============================================================================
-- template   — which renderer + subject to use when draining
-- payload    — jsonb args passed to the renderer (email addresses, tokens, ...)
-- not_before — earliest time to retry (throttle: ~60s out, daily: next UTC midnight)
-- attempts   — how many times drain has tried to send this row
-- sent_at    — non-null once Resend accepted the message
-- last_error — most recent failure reason, for debugging
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_queue (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template    text        NOT NULL,
  to_email    text        NOT NULL,
  payload     jsonb       NOT NULL,
  not_before  timestamptz NOT NULL DEFAULT now(),
  attempts    int         NOT NULL DEFAULT 0,
  last_error  text,
  sent_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Drain query: pull unsent rows whose not_before has passed, oldest first.
CREATE INDEX IF NOT EXISTS email_queue_drain_idx
  ON email_queue (not_before)
  WHERE sent_at IS NULL;

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only (same as verification_tokens).
