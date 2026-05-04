-- =============================================================================
-- v19: Explicitly set security_invoker = on for the map_entries view
-- =============================================================================
-- Problem:
--   The Supabase linter reports public.map_entries as SECURITY DEFINER.
--   Without an explicit WITH (security_invoker = on) clause, Supabase treats
--   views as running with the privileges of the view owner/creator rather than
--   those of the querying user.  This means RLS on the underlying entries table
--   is evaluated in the wrong security context, potentially exposing rows that
--   the calling role's policies should block.
--
-- Fix:
--   Recreate the view with WITH (security_invoker = on) so Postgres checks the
--   *caller's* privileges and RLS policies — not the owner's.  The underlying
--   GRANTs and RLS policy on entries (added in v14) already ensure anon/
--   authenticated can only read publicly visible rows, so no policy changes are
--   needed here.
--
-- The SELECT body is identical to v17; only the security option is new.
-- =============================================================================

DROP VIEW IF EXISTS public.map_entries;

CREATE VIEW public.map_entries
  WITH (security_invoker = on)
AS
SELECT
  e.id,
  e.display_name,
  ci.name  AS city,
  r.name   AS region,
  c.code   AS country,
  e.bio,
  e.socials,
  e.entity_type,
  CASE
    WHEN e.entity_type = 'shop'                                THEN e.exact_lat
    WHEN e.entity_type = 'club' AND e.club_venue_public = true THEN e.exact_lat
    ELSE e.lat
  END AS lat,
  CASE
    WHEN e.entity_type = 'shop'                                THEN e.exact_lng
    WHEN e.entity_type = 'club' AND e.club_venue_public = true THEN e.exact_lng
    ELSE e.lng
  END AS lng,
  CASE WHEN e.entity_type = 'shop' THEN e.address_line   ELSE NULL END AS address_line,
  CASE WHEN e.entity_type = 'shop' THEN e.postal_code    ELSE NULL END AS postal_code,
  CASE WHEN e.entity_type = 'shop' THEN e.hours          ELSE NULL END AS hours,
  CASE WHEN e.entity_type = 'shop' THEN e.verified_owner ELSE NULL END AS verified_owner,
  CASE WHEN e.entity_type = 'club' THEN e.club_meeting_info ELSE NULL END AS club_meeting_info,
  CASE WHEN e.entity_type = 'club' THEN e.club_venue_public ELSE NULL END AS club_venue_public,
  e.created_at
FROM public.entries e
JOIN      public.countries c  ON c.id  = e.country_id
LEFT JOIN public.regions   r  ON r.id  = e.region_id
LEFT JOIN public.cities    ci ON ci.id = e.city_id
WHERE e.is_visible             = true
  AND e.is_flagged             = false
  AND e.deleted_at             IS NULL
  AND e.auto_hidden_by_reports = false;

-- Restore grants (DROP removes them)
GRANT SELECT ON public.map_entries TO anon, authenticated;
