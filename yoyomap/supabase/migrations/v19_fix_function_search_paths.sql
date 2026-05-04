-- =============================================================================
-- v19: Fix mutable search_path on trigger functions (security lint 0011)
-- =============================================================================
-- Supabase's database linter flags functions whose search_path is not locked,
-- because a malicious user with CREATE privilege could shadow pg_catalog or
-- public objects and hijack the function's execution context.
--
-- Fix: add SET search_path = '' to both trigger functions so Postgres pins
-- an empty search_path for the duration of each call.  All table references
-- inside the function bodies are already fully qualified (public.*), so the
-- empty search_path causes no behavioural change.
--
-- Functions fixed:
--   • public.sync_entry_location_fks   (originally created in v17)
--   • public.sync_entry_country_from_city (created outside migration flow)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. sync_entry_location_fks
--    Fires BEFORE INSERT OR UPDATE OF city, region, country on public.entries.
--    Resolves country_id / region_id / city_id (auto-inserting new cities)
--    from the user-facing text columns so FK columns are always consistent.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_entry_location_fks()
RETURNS trigger LANGUAGE plpgsql
SET search_path = ''
AS $$
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

-- ---------------------------------------------------------------------------
-- 2. sync_entry_country_from_city
--    Fires BEFORE INSERT OR UPDATE OF city_id on public.entries.
--    When city_id is set directly (e.g. via an admin operation), this trigger
--    keeps country_id and region_id consistent with the chosen city so FK
--    integrity is maintained even when the text columns are not updated.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_entry_country_from_city()
RETURNS trigger LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.city_id IS NOT NULL THEN
    SELECT ci.country_id, ci.region_id
    INTO NEW.country_id, NEW.region_id
    FROM public.cities ci
    WHERE ci.id = NEW.city_id;
  END IF;
  RETURN NEW;
END;
$$;
