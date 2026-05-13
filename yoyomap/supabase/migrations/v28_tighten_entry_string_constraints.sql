-- v28: Tighten entry string constraints (defence-in-depth)
--
-- The application-layer Zod schema already enforces these limits.  These
-- CHECK constraints add a second line of defence so that no code path
-- (admin actions, direct Supabase calls, future migrations, etc.) can ever
-- persist out-of-range values.
--
-- All constraints are additive and non-destructive: every row that satisfies
-- the current Zod schema already satisfies these checks.

-- ---------------------------------------------------------------------------
-- entries: shop/club text columns
-- ---------------------------------------------------------------------------

-- Legacy-data backfill: keep only allowed socials keys and cap payload size.
-- If a legacy payload still exceeds 600 chars after key filtering, reset it
-- to an empty object so the defensive CHECK can be added safely.
WITH normalized_socials AS (
  SELECT
    e.id,
    COALESCE(
      (
        SELECT jsonb_object_agg(k, v)
        FROM jsonb_each(COALESCE(e.socials, '{}'::jsonb)) AS kv(k, v)
        WHERE k IN ('instagram', 'youtube', 'discord', 'website')
      ),
      '{}'::jsonb
    ) AS cleaned_socials
  FROM public.entries e
)
UPDATE public.entries e
SET socials = CASE
  WHEN char_length(ns.cleaned_socials::text) <= 600 THEN ns.cleaned_socials
  ELSE '{}'::jsonb
END
FROM normalized_socials ns
WHERE e.id = ns.id
  AND e.socials IS DISTINCT FROM (
    CASE
      WHEN char_length(ns.cleaned_socials::text) <= 600 THEN ns.cleaned_socials
      ELSE '{}'::jsonb
    END
  );

ALTER TABLE public.entries
  ADD CONSTRAINT entries_address_line_length
    CHECK (address_line IS NULL OR char_length(address_line) <= 200),

  ADD CONSTRAINT entries_postal_code_length
    CHECK (postal_code IS NULL OR char_length(postal_code) <= 20),

  ADD CONSTRAINT entries_hours_length
    CHECK (hours IS NULL OR char_length(hours) <= 500),

  ADD CONSTRAINT entries_club_meeting_info_length
    CHECK (club_meeting_info IS NULL OR char_length(club_meeting_info) <= 500),

  ADD CONSTRAINT entries_contact_name_length
    CHECK (contact_name IS NULL OR char_length(contact_name) <= 100),

  -- socials jsonb: reject unknown keys and cap total serialised length.
  -- The subtraction expression returns '{}' when no unknown keys remain.
  ADD CONSTRAINT entries_socials_keys
    CHECK (
      char_length(socials::text) <= 600
      AND (socials - 'instagram' - 'youtube' - 'discord' - 'website') = '{}'::jsonb
    );

-- ---------------------------------------------------------------------------
-- parent_consents: relationship enum
-- ---------------------------------------------------------------------------

ALTER TABLE public.parent_consents
  ADD CONSTRAINT parent_consents_relationship_values
    CHECK (relationship IN ('parent', 'legal guardian'));

-- ---------------------------------------------------------------------------
-- reports: reason enum and details length
-- ---------------------------------------------------------------------------

ALTER TABLE public.reports
  ADD CONSTRAINT reports_reason_values
    CHECK (reason IN (
      'spam',
      'harassment',
      'impersonation',
      'minor_unsafe',
      'fake_business',
      'unauthorized_listing',
      'other'
    )),

  ADD CONSTRAINT reports_details_length
    CHECK (details IS NULL OR char_length(details) <= 1000);
