-- =============================================================================
-- Migration: Location-status tracking + location-confirm token purpose
-- =============================================================================

ALTER TABLE public.entries
ADD COLUMN IF NOT EXISTS location_status text NOT NULL DEFAULT 'auto_geocoded';

ALTER TABLE public.entries
DROP CONSTRAINT IF EXISTS entries_location_status_check;

ALTER TABLE public.entries
ADD CONSTRAINT entries_location_status_check
CHECK (
  location_status IN (
    'verified',
    'auto_geocoded',
    'needs_research',
    'awaiting_owner_response',
    'dead_pin'
  )
);

CREATE INDEX IF NOT EXISTS entries_location_status_idx
  ON public.entries (location_status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.verification_tokens
DROP CONSTRAINT IF EXISTS verification_tokens_purpose_check;

ALTER TABLE public.verification_tokens
ADD CONSTRAINT verification_tokens_purpose_check
CHECK (purpose IN ('email_verify', 'edit_link', 'delete_link', 'location_confirm'));
