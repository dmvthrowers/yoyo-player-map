-- =============================================================================
-- Persistent geocode cache. Nominatim's free tier allows ~1 req/sec and
-- forbids bulk use. We cache every successful lookup here, keyed by a
-- normalized query hash, so repeat lookups (reminders, re-geocodes, churn)
-- never hit Nominatim again. Survives deploys, unlike Next's fetch cache.
-- =============================================================================
-- query_hash  — sha256 of the normalized query (city|region|country OR
--               addressLine|city|region|postalCode|country, lowercased/trimmed)
-- query_kind  — 'city' or 'address' (for debugging / selective invalidation)
-- result      — jsonb GeocodeResult: { lat, lng, displayName, city, region?, country }
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.geocode_cache (
  query_hash  text        PRIMARY KEY,
  query_kind  text        NOT NULL CHECK (query_kind IN ('city','address')),
  result      jsonb       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only.
