-- =============================================================================
-- v20: Revoke unnecessary privileges to suppress GraphQL schema-exposure lint
-- =============================================================================
-- Supabase's database linter (0026/0027) flags every table/view that the
-- `anon` or `authenticated` role can SELECT, because those objects appear in
-- the pg_graphql schema — even when the app never uses the GraphQL endpoint.
--
-- Root cause: Supabase configures default privileges so that every new table
-- in the public schema is initially accessible to both roles.  The initial
-- schema.sql revoked `anon` from four sensitive tables but left `authenticated`
-- unrestricted on all of them, and the tables added later (email_queue,
-- email_send_log, geocode_cache) were never revoked from either role.
--
-- Fix strategy
-- ─────────────
-- • Fully revoke anon + authenticated on the three server-only tables:
--     email_queue, email_send_log, geocode_cache
--   These are read/written exclusively via the service-role client; neither
--   role should ever reach them through PostgREST or GraphQL.
--
-- • Revoke authenticated on the four tables already revoked from anon:
--     audit_log, parent_consents, reports, verification_tokens
--   schema.sql has "revoke all … from anon" for these, but left
--   `authenticated` with the Supabase-default SELECT.
--
-- Tables intentionally left granted (required for the security_invoker view)
-- ─────────────────────────────────────────────────────────────────────────
-- entries, countries, regions, cities, map_entries still have SELECT for
-- anon/authenticated because map_entries uses WITH (security_invoker = on):
-- Postgres checks the *caller's* grants on every joined table, so those
-- grants must stay.  The remaining GraphQL-exposure warnings for these
-- objects are an accepted architectural trade-off; data is gated by RLS on
-- entries and the view's own WHERE clause.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Server-only tables: revoke from both anon and authenticated
-- ---------------------------------------------------------------------------

REVOKE ALL ON public.email_queue    FROM anon, authenticated;
REVOKE ALL ON public.email_send_log FROM anon, authenticated;
REVOKE ALL ON public.geocode_cache  FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Sensitive internal tables: revoke authenticated
--    (anon was already revoked in the original schema.sql)
-- ---------------------------------------------------------------------------

REVOKE ALL ON public.audit_log            FROM authenticated;
REVOKE ALL ON public.parent_consents      FROM authenticated;
REVOKE ALL ON public.reports              FROM authenticated;
REVOKE ALL ON public.verification_tokens  FROM authenticated;
