-- =============================================================================
-- v17: Location sync trigger + update map_entries view to use FK JOINs
-- =============================================================================
-- Part A: Trigger — keeps city_id / region_id / country_id in sync
--   whenever the city / region / country text fields change on entries.
--   Text fields remain the user-facing authoritative input; FKs are
--   always auto-resolved (and auto-created for new cities).
--
-- Part B: Update map_entries view to source location names from the
--   normalized tables instead of the raw text columns, making the FK
--   the single display source of truth.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Part A: Sync trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_entry_location_fks()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_country_id integer;
  v_region_id  integer;
  v_city_id    integer;
BEGIN
  -- Resolve country (2-letter ISO code stored in entries.country)
  SELECT id INTO v_country_id
  FROM public.countries
  WHERE code = upper(trim(NEW.country));

  NEW.country_id := v_country_id;

  -- Resolve region (optional — null if country has no region or field is blank)
  IF NEW.region IS NOT NULL AND trim(NEW.region) <> '' THEN
    SELECT id INTO v_region_id
    FROM public.regions
    WHERE country_id = v_country_id
      AND lower(name) = lower(trim(NEW.region))
    LIMIT 1;
    NEW.region_id := v_region_id;
  ELSE
    NEW.region_id := NULL;
  END IF;

  -- Resolve city; auto-insert if not found
  SELECT id INTO v_city_id
  FROM public.cities
  WHERE country_id = v_country_id
    AND region_id IS NOT DISTINCT FROM NEW.region_id
    AND lower(name) = lower(trim(NEW.city))
  LIMIT 1;

  IF v_city_id IS NULL AND v_country_id IS NOT NULL THEN
    INSERT INTO public.cities (country_id, region_id, name)
    VALUES (v_country_id, NEW.region_id, initcap(trim(NEW.city)))
    ON CONFLICT (country_id, region_id, name) DO NOTHING;

    SELECT id INTO v_city_id
    FROM public.cities
    WHERE country_id = v_country_id
      AND region_id IS NOT DISTINCT FROM NEW.region_id
      AND lower(name) = lower(trim(NEW.city));
  END IF;

  NEW.city_id := v_city_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER entries_sync_location_fks
  BEFORE INSERT OR UPDATE OF city, region, country
  ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.sync_entry_location_fks();

-- ---------------------------------------------------------------------------
-- Part B: Recreate map_entries view using FK JOINs for location names.
-- DROP + recreate preserves the same column names/types; grants re-applied.
-- Preserves the existing lat/lng smart logic (exact coords for shops and
-- clubs with public venues; jittered coords for persons).
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.map_entries;

CREATE VIEW public.map_entries AS
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
JOIN  public.countries c  ON c.id  = e.country_id
LEFT JOIN public.regions r    ON r.id  = e.region_id
LEFT JOIN public.cities  ci   ON ci.id = e.city_id
WHERE e.is_visible             = true
  AND e.is_flagged             = false
  AND e.deleted_at             IS NULL
  AND e.auto_hidden_by_reports = false;

-- Restore grants (DROP removes them)
GRANT SELECT ON public.map_entries TO anon, authenticated;
