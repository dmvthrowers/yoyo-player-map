-- =============================================================================
-- v31: Backfill data so the v30 entries_type_invariants constraint can apply
-- =============================================================================
--
-- v30 tightened the CHECK constraint in two ways that break existing rows:
--
-- 1. PUBLIC CLUBS (club_venue_public = true):
--    The old v2 constraint required address_line IS NULL for ALL clubs.
--    So every public club created before v30 has address_line = NULL.
--    The new constraint requires address_line IS NOT NULL for public clubs.
--    Fix: downgrade those clubs to private-venue so they satisfy the constraint
--    (club_venue_public = false, exact coords cleared).
--
-- 2. PERSONS with postal_code set:
--    The old constraint did not check postal_code for persons, so it was
--    possible (though unlikely) to persist a non-NULL postal_code on a person.
--    The new constraint requires postal_code IS NULL for persons.
--    Fix: clear postal_code on those rows.
--
-- After the backfill, re-apply the constraint and view idempotently to recover
-- from a partial v30 run (DROP succeeded but ADD failed, leaving no constraint
-- or no view).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Downgrade public clubs that have no address_line to private-venue.
--    Clear exact coords too — they are meaningless without a street address
--    and must be NULL for private-venue clubs per the new constraint.
-- ---------------------------------------------------------------------------
UPDATE public.entries
SET    club_venue_public = false,
       exact_lat         = NULL,
       exact_lng         = NULL
WHERE  entity_type       = 'club'
  AND  club_venue_public = true
  AND  address_line      IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Clear postal_code from person entries (not permitted by new constraint).
-- ---------------------------------------------------------------------------
UPDATE public.entries
SET    postal_code = NULL
WHERE  entity_type = 'person'
  AND  postal_code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Re-apply the entries_type_invariants constraint (idempotent).
--    Necessary in case v30 partially ran: DROP succeeded but ADD failed.
-- ---------------------------------------------------------------------------
ALTER TABLE public.entries
  DROP CONSTRAINT IF EXISTS entries_type_invariants;

ALTER TABLE public.entries
  ADD CONSTRAINT entries_type_invariants CHECK (
    CASE entity_type
      WHEN 'person' THEN
        age_band IS NOT NULL
        AND exact_lat IS NULL
        AND exact_lng IS NULL
        AND address_line IS NULL
        AND postal_code IS NULL
        AND hours IS NULL
        AND club_meeting_info IS NULL
        AND club_venue_public IS NULL

      WHEN 'shop' THEN
        exact_lat IS NOT NULL
        AND exact_lng IS NOT NULL
        AND address_line IS NOT NULL
        AND age_band IS NULL
        AND club_meeting_info IS NULL
        AND club_venue_public IS NULL

      WHEN 'club' THEN
        club_venue_public IS NOT NULL
        AND age_band IS NULL
        AND hours IS NULL
        AND (
          (club_venue_public = false
            AND exact_lat IS NULL
            AND exact_lng IS NULL
            AND address_line IS NULL
            AND postal_code IS NULL)
          OR
          (club_venue_public = true
            AND exact_lat IS NOT NULL
            AND exact_lng IS NOT NULL
            AND address_line IS NOT NULL)
        )

      ELSE false
    END
  );

-- ---------------------------------------------------------------------------
-- 4. Recreate the map_entries view (idempotent).
--    Necessary in case v30 partially ran: DROP VIEW succeeded but the
--    migration aborted before CREATE VIEW.
-- ---------------------------------------------------------------------------
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
  CASE
    WHEN e.entity_type = 'shop' THEN e.address_line
    WHEN e.entity_type = 'club' AND e.club_venue_public = true THEN e.address_line
    ELSE NULL
  END AS address_line,
  CASE
    WHEN e.entity_type = 'shop' THEN e.postal_code
    WHEN e.entity_type = 'club' AND e.club_venue_public = true THEN e.postal_code
    ELSE NULL
  END AS postal_code,
  CASE WHEN e.entity_type = 'shop' THEN e.hours          ELSE NULL END AS hours,
  CASE WHEN e.entity_type = 'shop' THEN e.verified_owner ELSE NULL END AS verified_owner,
  CASE WHEN e.entity_type = 'club' THEN e.club_meeting_info ELSE NULL END AS club_meeting_info,
  CASE WHEN e.entity_type = 'club' THEN e.club_venue_public ELSE NULL END AS club_venue_public,
  e.created_at,
  (
    SELECT jsonb_object_agg(agg.category, agg.vals)
    FROM (
      SELECT
        et.category,
        jsonb_agg(et.value ORDER BY tc.sort_order) AS vals
      FROM public.entry_tags et
      JOIN public.tag_catalog tc
        ON tc.category = et.category
       AND tc.value    = et.value
      WHERE et.entry_id = e.id
      GROUP BY et.category
    ) agg
  ) AS tags
FROM public.entries e
JOIN      public.countries c  ON c.id  = e.country_id
LEFT JOIN public.regions   r  ON r.id  = e.region_id
LEFT JOIN public.cities    ci ON ci.id = e.city_id
WHERE e.is_visible             = true
  AND e.is_flagged             = false
  AND e.deleted_at             IS NULL
  AND e.auto_hidden_by_reports = false;

GRANT SELECT ON public.map_entries TO anon, authenticated;
