-- =============================================================================
-- v21: Hide public tables/views from the pg_graphql schema
-- =============================================================================
-- Problem:
--   Supabase database-linter rules 0026 (pg_graphql_anon_table_exposed) and
--   0027 (pg_graphql_authenticated_table_exposed) flag every object that the
--   anon / authenticated role can SELECT, because pg_graphql automatically
--   exposes those objects in its GraphQL schema.
--
--   Five objects remain flagged after v20 because their SELECT grants cannot
--   be revoked: the security_invoker map_entries view requires Postgres to
--   check the *caller's* privileges on every joined table, so anon must be
--   able to SELECT entries, countries, regions, and cities for PostgREST reads
--   to succeed.
--
-- Fix:
--   Use pg_graphql's @graphql({"expose": false}) table/view comment directive
--   to exclude each object from the GraphQL introspection schema.  This makes
--   the objects invisible to GraphQL clients while leaving PostgREST (REST API)
--   access fully intact.  The app never uses GraphQL; all reads go through the
--   PostgREST client (supabase.from(…).select(…)).
--
--   After this migration, lint rules 0026/0027 will no longer fire for these
--   five objects because they no longer appear in the GraphQL schema.
-- =============================================================================

-- Hide the public-map view from GraphQL (app uses PostgREST, not GraphQL).
COMMENT ON VIEW  public.map_entries IS E'@graphql({"expose": false})';

-- Hide the underlying lookup and entry tables.
-- These are still accessible via PostgREST for the REST API routes.
COMMENT ON TABLE public.entries   IS E'@graphql({"expose": false})';
COMMENT ON TABLE public.countries IS E'@graphql({"expose": false})';
COMMENT ON TABLE public.regions   IS E'@graphql({"expose": false})';
COMMENT ON TABLE public.cities    IS E'@graphql({"expose": false})';
