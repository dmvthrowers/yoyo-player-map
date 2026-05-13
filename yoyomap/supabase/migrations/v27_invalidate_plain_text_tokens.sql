-- v27: Invalidate all active tokens that were stored as plain text.
--
-- Application code now hashes tokens (SHA-256) before inserting them into
-- verification_tokens.token and parent_consents.consent_token, and hashes
-- the received token before looking it up.  Any plain-text tokens already in
-- the database will no longer match their hashed lookup, so users would get a
-- cryptic "invalid" error instead of "expired".  Expiring them here gives a
-- clear "link expired, please request a new one" message instead.
--
-- Impact:
--   • Active edit_link tokens (1 h TTL): invalidated — users re-request via magic link.
--   • Active email_verify tokens (24 h TTL): invalidated — users re-request via submit.
--   • Active location_confirm tokens (7 d TTL): invalidated — admin can re-send outreach.
--   • Active parent_consents rows where consented_at IS NULL: the consent_token
--     column now stores a hashed value after this deploy, so existing plain-text
--     rows are unreachable.  Set revoked_at so parents re-receive the request.
--
-- All existing *used* tokens (used_at IS NOT NULL) are unaffected; they are
-- already inert and are not removed.

-- Expire all unused verification tokens immediately.
UPDATE public.verification_tokens
SET    expires_at = NOW()
WHERE  used_at IS NULL
  AND  expires_at > NOW();

-- Mark unconsumed parent consents as revoked so the entry stays hidden and
-- the admin knows to re-send the consent email.
UPDATE public.parent_consents
SET    revoked_at = NOW()
WHERE  consented_at IS NULL
  AND  revoked_at IS NULL;
