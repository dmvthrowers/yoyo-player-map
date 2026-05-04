-- =============================================================================
-- Fix public read access to map_entries
-- =============================================================================
-- Why this exists:
--   - schema.sql originally assumed the map_entries view ran with definer
--     rights, so it granted SELECT on the view and revoked all access to the
--     underlying entries table from anon.
--   - On current Supabase projects, views run with security_invoker = true by
--     default, which causes Postgres to check the *caller's* privileges on the
--     underlying table. With the REVOKE in place, anon hits
--     "permission denied for table entries" before RLS is even evaluated.
--   - Fix: grant SELECT on entries to anon/authenticated, and add an RLS
--     policy that mirrors the view's WHERE clause so only publicly visible
--     rows are readable. The select-list in lib/locations.ts is already safe.
-- =============================================================================

-- Restore table-level SELECT so the GRANT layer no longer blocks the view.
grant select on public.entries to anon, authenticated;

-- Remove any earlier permissive policy added during incident response.
drop policy if exists "public read entries" on public.entries;

-- Mirror the map_entries view filter so anon can only see rows the view
-- would have exposed anyway.
create policy "public read visible entries"
  on public.entries for select
  to anon, authenticated
  using (
    is_visible = true
    and is_flagged = false
    and deleted_at is null
    and auto_hidden_by_reports = false
  );
