-- =============================================================================
-- v29: Fix GraphQL exposure warnings + multiple permissive policy warnings
-- =============================================================================
--
-- Addresses Supabase database-linter findings:
--
-- 0026/0027 pg_graphql_anon_table_exposed /
--           pg_graphql_authenticated_table_exposed
--   tag_catalog and entry_tags were added in v24, after v21 hid the original
--   five objects. Hide them now using the same @graphql directive pattern.
--
-- 0006 multiple_permissive_policies
--   Two cases where a FOR ALL policy inadvertently adds a redundant permissive
--   SELECT policy alongside a dedicated SELECT policy:
--
--   a) tag_catalog: tag_catalog_no_direct_write (FOR ALL, USING false) fires
--      as a permissive SELECT policy alongside tag_catalog_read_all. Replace
--      with explicit INSERT / UPDATE / DELETE deny policies so SELECT is only
--      governed by tag_catalog_read_all.
--
--   b) entry_tags: entry_tags_owner_write (FOR ALL) fires as a permissive
--      SELECT policy alongside entry_tags_read_visible. Replace with explicit
--      INSERT and DELETE policies so SELECT is only governed by
--      entry_tags_read_visible.
--
-- All functional behaviour is preserved — no SELECT access changes.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Hide tag_catalog and entry_tags from GraphQL schema
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.tag_catalog IS E'@graphql({"expose": false})';
COMMENT ON TABLE public.entry_tags  IS E'@graphql({"expose": false})';


-- ---------------------------------------------------------------------------
-- 2. Fix tag_catalog: replace FOR ALL deny with per-command deny policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tag_catalog_no_direct_write" ON public.tag_catalog;

-- Deny INSERT from anon/authenticated directly (service role bypasses RLS).
CREATE POLICY "tag_catalog_no_insert"
  ON public.tag_catalog FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "tag_catalog_no_update"
  ON public.tag_catalog FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "tag_catalog_no_delete"
  ON public.tag_catalog FOR DELETE
  TO anon, authenticated
  USING (false);


-- ---------------------------------------------------------------------------
-- 3. Fix entry_tags: replace FOR ALL owner policy with INSERT + DELETE only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "entry_tags_owner_write" ON public.entry_tags;

-- Owner can insert their own tags.
-- Uses initPlan scalar-subquery pattern (consistent with v6 RLS optimisation).
CREATE POLICY "entry_tags_owner_insert"
  ON public.entry_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entries e
      WHERE e.id = entry_tags.entry_id
        AND (SELECT auth.jwt()) ->> 'email' = e.email::text
    )
  );

-- Owner can delete their own tags.
CREATE POLICY "entry_tags_owner_delete"
  ON public.entry_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entries e
      WHERE e.id = entry_tags.entry_id
        AND (SELECT auth.jwt()) ->> 'email' = e.email::text
    )
  );
