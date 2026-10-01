-- =============================================================================
-- v32: Stop the public anon key reading private columns on entries
-- =============================================================================
--
-- map_entries is a security_invoker view (v19), so anon needs SELECT on the
-- entries columns it reads. Until now anon and authenticated had SELECT on
-- every column, and the "public read visible entries" policy let anyone with
-- the public anon key run
--   GET /rest/v1/entries?select=email,age_band,contact_name,...
-- and read the email (and age band, contact name, parent consent id, flag
-- reason, reminder counts) of every visible entry. That breaks the
-- city-level-only privacy promise.
--
-- Fix: replace the table-wide grants with a column list covering exactly what
-- map_entries, the entries RLS policy and the entry_tags read policy need.
-- Server routes use the service role and are unaffected. The app never signs
-- users in to Supabase Auth, so authenticated gets the same read-only list.
--
-- exact_lat/exact_lng/address_line/postal_code stay readable because the view
-- shows them for shops (and clubs with club_venue_public). Person entries
-- never store exact coordinates or addresses.
-- =============================================================================

REVOKE ALL ON public.entries FROM anon, authenticated;

GRANT SELECT (
  id, display_name, entity_type, bio, socials,
  city_id, region_id, country_id,
  lat, lng, exact_lat, exact_lng, address_line, postal_code,
  hours, verified_owner, club_meeting_info, club_venue_public,
  created_at,
  is_visible, is_flagged, deleted_at, auto_hidden_by_reports
) ON public.entries TO anon, authenticated;
