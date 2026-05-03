-- =============================================================================
-- v15: Fix remaining location data gaps
-- =============================================================================
-- Issues addressed:
--   1. "Kailua Kona" (no hyphen, city id=25274) is a duplicate of
--      "Kailua-Kona" (city id=25275). Merge to the canonical record.
--   2. Entry that typed "Kailua" was incorrectly mapped to "Kailua-Kona".
--      Kailua (Oahu) and Kailua-Kona (Big Island) are ~200 miles apart.
--      Insert a proper "Kailua, Hawaii" city and re-point the entry.
--   3. "Shelby Charter Township" entry has an abbreviated FK city name
--      ("Shelby Charter Twp") and is missing its region FK (Michigan).
--      Correct the city name and set region_id.
--   4. Purge expired unused verification tokens (> 7 days past expiry).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Consolidate Kailua-Kona duplicates
--    city 25274 = "Kailua Kona" (no hyphen) is a duplicate of
--    city 25275 = "Kailua-Kona" (canonical).
-- ---------------------------------------------------------------------------
UPDATE public.entries
SET city_id = 25275,
    city    = 'Kailua-Kona'
WHERE id = 'e941ecd0-aa12-45a7-9562-c947a143c1d1';

DELETE FROM public.cities WHERE id = 25274;

-- ---------------------------------------------------------------------------
-- 2. Fix "Kailua" entry that was incorrectly mapped to Kailua-Kona
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_us_id     integer;
  v_hi_id     integer := 3334;  -- Hawaii region
  v_kailua_id integer;
BEGIN
  SELECT id INTO v_us_id FROM public.countries WHERE code = 'US';

  INSERT INTO public.cities (country_id, region_id, name)
  VALUES (v_us_id, v_hi_id, 'Kailua')
  ON CONFLICT (country_id, region_id, name) DO NOTHING;

  SELECT id INTO v_kailua_id
  FROM public.cities
  WHERE country_id = v_us_id
    AND region_id  = v_hi_id
    AND lower(name) = 'kailua';

  UPDATE public.entries
  SET city_id = v_kailua_id
  WHERE id = '6840c076-fe7a-4323-8f52-65289f0fb9f6';
END $$;

-- ---------------------------------------------------------------------------
-- 3. Fix Shelby Charter Township: full name + Michigan region FK
-- ---------------------------------------------------------------------------
UPDATE public.cities
SET name      = 'Shelby Charter Township',
    region_id = 696  -- Michigan
WHERE id = 25270;

UPDATE public.entries
SET city      = 'Shelby Charter Township',
    region_id = 696
WHERE id = '3028ba6b-7a3f-41a7-bfec-0c5f505d91fa';

-- ---------------------------------------------------------------------------
-- 4. Purge expired unused verification tokens (> 7 days past expiry)
-- ---------------------------------------------------------------------------
DELETE FROM public.verification_tokens
WHERE used_at   IS NULL
  AND expires_at < now() - interval '7 days';

COMMIT;
