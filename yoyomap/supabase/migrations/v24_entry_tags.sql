-- =============================================================================
-- v24: Tag catalog + per-entry tags with RLS; extend map_entries with tags
-- =============================================================================
-- Introduces two tables:
--   tag_catalog  — canonical set of (category, value) pairs with labels
--   entry_tags   — m:n join between entries and tag_catalog
--
-- Categories seeded:
--   skill_toy   yoyo | kendama | diabolo | juggling | footbag |
--               spintop | contact | levistick | magic
--   for_hire    local | regional | national | global
--   artist      photographer | illustrator | videographer | designer
--   maker       wood | metal | plastic | resin | hybrid
--
-- map_entries gains a nullable `tags` jsonb column:
--   { "skill_toy": ["yoyo","kendama"], "for_hire": ["regional"] }
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. tag_catalog
-- ---------------------------------------------------------------------------
CREATE TABLE public.tag_catalog (
  category   text    NOT NULL,
  value      text    NOT NULL,
  label_en   text    NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (category, value)
);

-- Public read (same rationale as countries/regions/cities — not sensitive)
GRANT SELECT ON public.tag_catalog TO anon, authenticated;

-- Admin-only writes — service role bypasses RLS; deny all direct client writes
ALTER TABLE public.tag_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tag_catalog_read_all"
  ON public.tag_catalog FOR SELECT
  USING (true);

CREATE POLICY "tag_catalog_no_direct_write"
  ON public.tag_catalog FOR ALL
  TO anon, authenticated
  USING (false);


-- ---------------------------------------------------------------------------
-- 2. Seed tag_catalog
-- ---------------------------------------------------------------------------
INSERT INTO public.tag_catalog (category, value, label_en, sort_order) VALUES
  -- skill_toy
  ('skill_toy', 'yoyo',      'Yo-Yo',       1),
  ('skill_toy', 'kendama',   'Kendama',      2),
  ('skill_toy', 'diabolo',   'Diabolo',      3),
  ('skill_toy', 'juggling',  'Juggling',     4),
  ('skill_toy', 'footbag',   'Footbag',      5),
  ('skill_toy', 'spintop',   'Spin Top',     6),
  ('skill_toy', 'contact',   'Contact',      7),
  ('skill_toy', 'levistick', 'Levi Stick',   8),
  ('skill_toy', 'magic',     'Magic',        9),
  -- for_hire
  ('for_hire',  'local',     'Local',        1),
  ('for_hire',  'regional',  'Regional',     2),
  ('for_hire',  'national',  'National',     3),
  ('for_hire',  'global',    'Global',       4),
  -- artist
  ('artist',    'photographer', 'Photographer', 1),
  ('artist',    'illustrator',  'Illustrator',  2),
  ('artist',    'videographer', 'Videographer', 3),
  ('artist',    'designer',     'Designer',     4),
  -- maker
  ('maker',     'wood',    'Wood',   1),
  ('maker',     'metal',   'Metal',  2),
  ('maker',     'plastic', 'Plastic',3),
  ('maker',     'resin',   'Resin',  4),
  ('maker',     'hybrid',  'Hybrid', 5);


-- ---------------------------------------------------------------------------
-- 3. entry_tags
-- ---------------------------------------------------------------------------
CREATE TABLE public.entry_tags (
  entry_id   uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  category   text NOT NULL,
  value      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, category, value),
  FOREIGN KEY (category, value) REFERENCES public.tag_catalog (category, value)
);

-- Index for filter queries (e.g. WHERE category = 'skill_toy' AND value = 'kendama')
CREATE INDEX entry_tags_category_value_idx ON public.entry_tags (category, value);

-- Grants
GRANT SELECT ON public.entry_tags TO anon, authenticated;
GRANT INSERT, DELETE ON public.entry_tags TO authenticated;

ALTER TABLE public.entry_tags ENABLE ROW LEVEL SECURITY;

-- Anon/authenticated can read tags only for entries that are publicly visible.
-- Mirror the map_entries WHERE conditions rather than querying the view itself
-- to avoid a recursive dependency (map_entries will include entry_tags).
CREATE POLICY "entry_tags_read_visible"
  ON public.entry_tags FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entries e
      WHERE e.id = entry_tags.entry_id
        AND e.is_visible             = true
        AND e.is_flagged             = false
        AND e.deleted_at             IS NULL
        AND e.auto_hidden_by_reports = false
    )
  );

-- Entry owner can insert/delete their own tags.
-- Uses the initPlan scalar-subquery pattern (matches v6 RLS optimisation).
CREATE POLICY "entry_tags_owner_write"
  ON public.entry_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entries e
      WHERE e.id = entry_tags.entry_id
        AND (SELECT auth.jwt()) ->> 'email' = e.email::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entries e
      WHERE e.id = entry_tags.entry_id
        AND (SELECT auth.jwt()) ->> 'email' = e.email::text
    )
  );


-- ---------------------------------------------------------------------------
-- 4. Extend map_entries view to include aggregated tags
-- ---------------------------------------------------------------------------
-- DROP + full recreate is the only way to add a column to a view.
-- security_invoker = on is carried forward from v19.
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
  CASE WHEN e.entity_type = 'shop' THEN e.address_line   ELSE NULL END AS address_line,
  CASE WHEN e.entity_type = 'shop' THEN e.postal_code    ELSE NULL END AS postal_code,
  CASE WHEN e.entity_type = 'shop' THEN e.hours          ELSE NULL END AS hours,
  CASE WHEN e.entity_type = 'shop' THEN e.verified_owner ELSE NULL END AS verified_owner,
  CASE WHEN e.entity_type = 'club' THEN e.club_meeting_info ELSE NULL END AS club_meeting_info,
  CASE WHEN e.entity_type = 'club' THEN e.club_venue_public ELSE NULL END AS club_venue_public,
  e.created_at,
  -- Aggregated tags: { "skill_toy": ["yoyo"], "for_hire": ["regional"] }
  -- NULL when no tags exist for the entry.
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

-- Restore grants (DROP removes them)
GRANT SELECT ON public.map_entries TO anon, authenticated;
