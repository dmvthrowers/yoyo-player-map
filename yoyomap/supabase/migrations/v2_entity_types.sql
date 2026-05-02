-- =============================================================================
-- Migration: Add Entity Types (person / shop / club)
-- =============================================================================
-- This migration extends the yo-yo map from people-only to three entity types:
--   1. person (default) — individual throwers, jittered coords, privacy-first
--   2. shop — physical yo-yo stores, exact street-level coords, public address
--   3. club — yo-yo clubs, either jittered (private venue) or exact (public venue)
-- =============================================================================

-- Add entity_type discriminator column
ALTER TABLE public.entries
ADD COLUMN IF NOT EXISTS entity_type text NOT NULL DEFAULT 'person'
CHECK (entity_type IN ('person', 'shop', 'club'));

-- Create index for entity_type filtering
CREATE INDEX IF NOT EXISTS entries_entity_type_idx ON public.entries (entity_type);

-- Add exact coordinates for shops and public-venue clubs
-- These are street-level addresses, NOT jittered
ALTER TABLE public.entries
ADD COLUMN IF NOT EXISTS exact_lat double precision,
ADD COLUMN IF NOT EXISTS exact_lng double precision;

-- Shop-specific fields
ALTER TABLE public.entries
ADD COLUMN IF NOT EXISTS address_line text,  -- Street address for shops
ADD COLUMN IF NOT EXISTS postal_code text,   -- Postal/zip code
ADD COLUMN IF NOT EXISTS hours text;         -- Store hours (freeform text for v1)

-- Club-specific fields
ALTER TABLE public.entries
ADD COLUMN IF NOT EXISTS club_meeting_info text,     -- "Every Saturday 2-5pm at..."
ADD COLUMN IF NOT EXISTS club_venue_public boolean;  -- true = show exact location, false = jittered

-- Shared internal field (never exposed)
ALTER TABLE public.entries
ADD COLUMN IF NOT EXISTS contact_name text;  -- Internal contact for shops/clubs

-- Verified owner flag (for shops: email domain matches website domain)
ALTER TABLE public.entries
ADD COLUMN IF NOT EXISTS verified_owner boolean NOT NULL DEFAULT false;

-- Auto-hide flag (set by certain report reasons like impersonation, fake_business)
ALTER TABLE public.entries
ADD COLUMN IF NOT EXISTS auto_hidden_by_reports boolean NOT NULL DEFAULT false;

-- Make age_band nullable (it's only required for persons)
ALTER TABLE public.entries
ALTER COLUMN age_band DROP NOT NULL;

-- =============================================================================
-- Type invariants check constraint
-- =============================================================================
-- Ensures each entity type has the right fields filled/empty:
--   - Person: age_band required, no exact coords/address/hours/club fields
--   - Shop: exact coords + address required, no age_band/club fields
--   - Club: club_venue_public required; if public, exact coords required
-- =============================================================================
ALTER TABLE public.entries
DROP CONSTRAINT IF EXISTS entries_type_invariants;

ALTER TABLE public.entries
ADD CONSTRAINT entries_type_invariants CHECK (
  CASE entity_type
    -- Person: must have age_band, must NOT have shop/club fields
    WHEN 'person' THEN
      age_band IS NOT NULL
      AND exact_lat IS NULL
      AND exact_lng IS NULL
      AND address_line IS NULL
      AND hours IS NULL
      AND club_meeting_info IS NULL
      AND club_venue_public IS NULL
    
    -- Shop: must have exact coords and address, no age_band or club fields
    WHEN 'shop' THEN
      exact_lat IS NOT NULL
      AND exact_lng IS NOT NULL
      AND address_line IS NOT NULL
      AND age_band IS NULL
      AND club_meeting_info IS NULL
      AND club_venue_public IS NULL
    
    -- Club: must have venue visibility flag; if public, must have exact coords
    WHEN 'club' THEN
      club_venue_public IS NOT NULL
      AND age_band IS NULL
      AND address_line IS NULL
      AND hours IS NULL
      AND (
        (club_venue_public = false)
        OR (club_venue_public = true AND exact_lat IS NOT NULL AND exact_lng IS NOT NULL)
      )
    
    ELSE false
  END
);

-- =============================================================================
-- Updated map_entries view
-- =============================================================================
-- Includes entity_type and conditionally exposes coordinates:
--   - Persons: jittered lat/lng only
--   - Shops: exact_lat/exact_lng (street address)
--   - Clubs with public venue: exact_lat/exact_lng
--   - Clubs with private venue: jittered lat/lng
--
-- EXCLUDES entries where auto_hidden_by_reports = true
-- =============================================================================
CREATE OR REPLACE VIEW public.map_entries AS
SELECT
  e.id,
  e.display_name,
  e.city,
  e.region,
  e.country,
  e.bio,
  e.socials,
  e.entity_type,
  -- Conditional coordinate exposure
  CASE
    WHEN e.entity_type = 'shop' THEN e.exact_lat
    WHEN e.entity_type = 'club' AND e.club_venue_public = true THEN e.exact_lat
    ELSE e.lat  -- Jittered coords for persons and private-venue clubs
  END AS lat,
  CASE
    WHEN e.entity_type = 'shop' THEN e.exact_lng
    WHEN e.entity_type = 'club' AND e.club_venue_public = true THEN e.exact_lng
    ELSE e.lng  -- Jittered coords for persons and private-venue clubs
  END AS lng,
  -- Shop-specific fields (null for non-shops)
  CASE WHEN e.entity_type = 'shop' THEN e.address_line ELSE NULL END AS address_line,
  CASE WHEN e.entity_type = 'shop' THEN e.postal_code ELSE NULL END AS postal_code,
  CASE WHEN e.entity_type = 'shop' THEN e.hours ELSE NULL END AS hours,
  CASE WHEN e.entity_type = 'shop' THEN e.verified_owner ELSE NULL END AS verified_owner,
  -- Club-specific fields (null for non-clubs)
  CASE WHEN e.entity_type = 'club' THEN e.club_meeting_info ELSE NULL END AS club_meeting_info,
  CASE WHEN e.entity_type = 'club' THEN e.club_venue_public ELSE NULL END AS club_venue_public,
  e.created_at
FROM public.entries e
WHERE e.is_visible = true
  AND e.is_flagged = false
  AND e.deleted_at IS NULL
  AND e.auto_hidden_by_reports = false;

-- Re-grant access to the view after recreation
GRANT SELECT ON public.map_entries TO anon, authenticated;

-- =============================================================================
-- Done. Existing person entries remain valid since:
--   - entity_type defaults to 'person'
--   - age_band already has values
--   - New columns start as NULL (matching person invariants)
-- =============================================================================
