create table if not exists public.geocode_cache (
  query text primary key,
  lat double precision not null,
  lon double precision not null,
  result jsonb not null,
  cached_at timestamptz not null default now()
);

alter table public.geocode_cache enable row level security;
create policy "allow public read" on public.geocode_cache for select using (true);