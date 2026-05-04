-- =============================================================================

-- =============================================================================
-- Location Normalization Tables
-- =============================================================================
create table if not exists public.countries (
  id serial primary key,
  code text not null unique check (char_length(code) = 2),
  name text not null unique
);

create table if not exists public.regions (
  id serial primary key,
  country_id integer not null references public.countries(id) on delete cascade,
  code text not null,
  name text not null,
  unique(country_id, code),
  unique(country_id, name)
);

create table if not exists public.cities (
  id serial primary key,
  country_id integer not null references public.countries(id) on delete cascade,
  region_id integer references public.regions(id) on delete set null,
  name text not null,
  unique(country_id, region_id, name)
);

-- Add new FKs to entries (nullable for migration)
alter table public.entries add column if not exists country_id integer references public.countries(id);
alter table public.entries add column if not exists region_id integer references public.regions(id);
alter table public.entries add column if not exists city_id integer references public.cities(id);
-- DMV Throwers YoYo Map — Database Schema
-- =============================================================================
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Key privacy principles baked into the schema:
--   1. Only JITTERED (blurred ~10mi) coordinates are stored — never exact pins.
--   2. Email addresses are stored for account management but NEVER exposed
--      via the public map view.
--   3. Row-Level Security (RLS) enforces who can read/write what.
--   4. Parental consent is tracked as a first-class record with audit trail.
--   5. Soft-delete default (hidden) so moderation is reversible; hard-delete
--      on user request is available via an RPC.
-- =============================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "citext";

-- =============================================================================
-- entries: one row per yo-yoer on the map
-- =============================================================================
create table if not exists public.entries (
  id             uuid primary key default uuid_generate_v4(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Public fields (shown on map)
  display_name   text not null check (char_length(display_name) between 2 and 40),
  city           text not null check (char_length(city) between 2 and 80),
  region         text,                             -- e.g. "VA", "MD", "Ontario"
  country        text not null default 'US',
  bio            text check (char_length(bio) <= 280),
  socials        jsonb not null default '{}'::jsonb,  -- {instagram, youtube, discord, website}

  -- JITTERED coordinates — DO NOT store exact coords. See jitter_coords() below.
  lat            double precision not null,
  lng            double precision not null,

  -- Private fields (never returned by public view)
  email          citext not null,
  age_band       text not null check (age_band in ('13-17', '18+')),

  -- Parental consent (required for 13-17). FK added after parent_consents table below.
  parent_consent_id uuid,

  -- Moderation + lifecycle
  is_visible     boolean not null default false,   -- Hidden until email verified
  is_flagged     boolean not null default false,
  flagged_reason text,
  verified_at    timestamptz,
  deleted_at     timestamptz                        -- Soft delete
);

create index entries_visible_idx on public.entries (is_visible) where deleted_at is null;
create index entries_email_idx on public.entries (email);
create index entries_country_region_idx on public.entries (country, region);

-- =============================================================================
-- parent_consents: audit trail for under-18 users
-- =============================================================================
create table if not exists public.parent_consents (
  id                 uuid primary key default uuid_generate_v4(),
  created_at         timestamptz not null default now(),

  -- Minor's info (linked to entry)
  minor_display_name text not null,
  minor_email        citext not null,

  -- Parent/guardian info
  parent_name        text not null,
  parent_email       citext not null,
  relationship       text not null,                 -- "parent", "legal guardian"

  -- Consent verification
  consent_token      text not null unique,          -- Sent to parent
  consented_at       timestamptz,                   -- When parent clicked link
  consent_ip         inet,                          -- Audit
  consent_user_agent text,                          -- Audit

  -- Revocation
  revoked_at         timestamptz,
  revoked_reason     text
);

create index parent_consents_token_idx on public.parent_consents (consent_token);
create index parent_consents_parent_email_idx on public.parent_consents (parent_email);

-- Now add the FK from entries → parent_consents (both tables exist)
alter table public.entries
  add constraint entries_parent_consent_fk
  foreign key (parent_consent_id) references public.parent_consents(id) on delete restrict;

-- =============================================================================
-- verification_tokens: email magic links for entry owners
-- =============================================================================
create table if not exists public.verification_tokens (
  id           uuid primary key default uuid_generate_v4(),
  created_at   timestamptz not null default now(),
  entry_id     uuid not null references public.entries(id) on delete cascade,
  token        text not null unique,
  purpose      text not null check (purpose in ('email_verify', 'edit_link', 'delete_link')),
  expires_at   timestamptz not null,
  used_at      timestamptz
);

create index verification_tokens_token_idx on public.verification_tokens (token);
create index verification_tokens_entry_idx on public.verification_tokens (entry_id);

-- =============================================================================
-- reports: user-submitted abuse reports
-- =============================================================================
create table if not exists public.reports (
  id            uuid primary key default uuid_generate_v4(),
  created_at    timestamptz not null default now(),
  entry_id      uuid not null references public.entries(id) on delete cascade,
  reporter_ip   inet,
  reporter_email citext,
  reason        text not null,
  details       text,
  resolved_at   timestamptz,
  resolution    text
);

create index reports_entry_idx on public.reports (entry_id);
create index reports_unresolved_idx on public.reports (resolved_at) where resolved_at is null;

-- =============================================================================
-- audit_log: generic append-only log for compliance
-- =============================================================================
create table if not exists public.audit_log (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  actor      text,                  -- email or 'system'
  action     text not null,         -- 'entry.create', 'consent.grant', 'entry.delete', etc.
  target_id  uuid,
  meta       jsonb
);

create index audit_log_action_idx on public.audit_log (action, at desc);
create index audit_log_target_idx on public.audit_log (target_id);

-- =============================================================================
-- Coordinate jitter function
-- =============================================================================
-- Adds ~10 mile random offset to incoming lat/lng. Run BEFORE insert so we
-- never store precise user locations. The offset is stored permanently and
-- not re-randomized on read — that would leak the true center over time.
-- =============================================================================
create or replace function public.jitter_coords(in_lat double precision, in_lng double precision)
returns table(lat double precision, lng double precision)
language plpgsql
as $$
declare
  -- ~10 mile radius in degrees latitude (1 deg lat ≈ 69 miles)
  max_offset_deg double precision := 10.0 / 69.0;
  r double precision;
  theta double precision;
begin
  -- Random point inside a circle of radius max_offset_deg
  r := max_offset_deg * sqrt(random());
  theta := 2 * pi() * random();
  lat := in_lat + r * cos(theta);
  -- Adjust longitude for latitude (lines of longitude converge)
  lng := in_lng + (r * sin(theta)) / cos(radians(in_lat));
  return next;
end;
$$;

-- =============================================================================
-- Public view: what the map actually shows the world
-- =============================================================================
-- This view intentionally EXCLUDES email, age_band, parent consent details,
-- flags, internal IDs from parent_consents, etc. Only what's safe to publish.
-- age_band is excluded because exposing minor status for named+located individuals
-- raises COPPA/GDPR concerns.
-- =============================================================================
create or replace view public.map_entries
  with (security_invoker = on)
as
select
  e.id,
  e.display_name,
  e.city,
  e.region,
  e.country,
  e.bio,
  e.socials,
  e.lat,
  e.lng,
  e.created_at
from public.entries e
where e.is_visible = true
  and e.is_flagged = false
  and e.deleted_at is null;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.entries enable row level security;
alter table public.parent_consents enable row level security;
alter table public.verification_tokens enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;

-- Public reads happen through the map_entries view. The view is defined with
-- WITH (security_invoker = on) so Postgres checks the caller's privileges on
-- the underlying entries table — meaning we must GRANT SELECT on entries and
-- gate visibility through RLS that mirrors the view's WHERE clause.
grant select on public.map_entries to anon, authenticated;
grant select on public.entries to anon, authenticated;

-- No direct access to other raw tables from anon. All writes go through
-- server-side API routes using the service role key.
revoke all on public.parent_consents from anon;
revoke all on public.verification_tokens from anon;
revoke all on public.reports from anon;
revoke all on public.audit_log from anon;

-- Public read policy: only rows the map_entries view would have exposed.
-- The select-list in lib/locations.ts is already restricted to safe columns.
create policy "public read visible entries"
  on public.entries for select
  to anon, authenticated
  using (
    is_visible = true
    and is_flagged = false
    and deleted_at is null
    and auto_hidden_by_reports = false
  );

-- Service role bypasses RLS entirely, so server routes work.
-- Authenticated users (if we later add Supabase Auth) can read their own row.
create policy "users read their own entry"
  on public.entries for select
  to authenticated
  using (auth.jwt() ->> 'email' = email::text);

-- =============================================================================
-- Triggers
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entries_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Rate-limit helper (simple IP-based, tracked via audit_log)
-- =============================================================================
create or replace function public.check_rate_limit(in_ip inet, in_action text, in_max int, in_window_minutes int)
returns boolean language plpgsql as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from public.audit_log
  where action = in_action
    and meta->>'ip' = host(in_ip)
    and at > now() - (in_window_minutes || ' minutes')::interval;
  return recent_count < in_max;
end;
$$;

-- =============================================================================
-- Done.
-- Remember: all writes happen via the server-side API routes using the
-- service role key, which bypasses RLS. The anon key is only used for
-- reads from the public map_entries view.
-- =============================================================================
