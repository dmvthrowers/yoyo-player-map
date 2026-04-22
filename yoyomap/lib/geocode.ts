/**
 * Geocoding via Nominatim (OpenStreetMap). Free, no API key.
 * We only use this server-side and respect Nominatim's 1 req/sec policy.
 * Docs: https://nominatim.org/release-docs/latest/api/Search/
 *
 * IMPORTANT: Nominatim's ToS requires a valid User-Agent with contact info.
 *
 * Caching: successful lookups are persisted to public.geocode_cache (keyed by
 * a sha256 of the normalized query) so repeat lookups never hit Nominatim —
 * this survives deploys, unlike Next's fetch cache. Rate limiting is enforced
 * by a process-local mutex that paces requests to 1/sec.
 */

import { createHash } from 'crypto';
import { createAdminClient } from './supabase/admin';

const NOMINATIM_UA = 'DMVThrowersYoYoMap/1.0 (dmvthrowers@gmail.com)';

// ---------------------------------------------------------------------------
// Rate limiter: serialize Nominatim requests, min 1100ms between starts.
// Process-local only — a single serverless instance can geocode one address
// per second. If Vercel spins up parallel instances they could each send
// 1 req/sec, which is acceptable under Nominatim's policy (per-application,
// not strictly per-process).
// ---------------------------------------------------------------------------
const NOMINATIM_MIN_INTERVAL_MS = 1100;
let nominatimChain: Promise<void> = Promise.resolve();
let lastNominatimAt = 0;

function pacedNominatim<T>(run: () => Promise<T>): Promise<T> {
  const next = nominatimChain.then(async () => {
    const elapsed = Date.now() - lastNominatimAt;
    const wait = NOMINATIM_MIN_INTERVAL_MS - elapsed;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastNominatimAt = Date.now();
  });
  nominatimChain = next.catch(() => {});
  return next.then(run);
}

// ---------------------------------------------------------------------------
// Persistent cache (public.geocode_cache)
// ---------------------------------------------------------------------------
function hashQuery(kind: 'city' | 'address', parts: (string | undefined)[]): string {
  const normalized = parts
    .map((p) => (p ?? '').trim().toLowerCase())
    .join('|');
  return createHash('sha256').update(`${kind}:${normalized}`).digest('hex');
}

async function readCache(queryHash: string): Promise<GeocodeResult | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('geocode_cache')
      .select('result')
      .eq('query_hash', queryHash)
      .maybeSingle();
    if (error || !data) return null;
    return data.result as GeocodeResult;
  } catch {
    return null;
  }
}

async function writeCache(queryHash: string, kind: 'city' | 'address', result: GeocodeResult): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from('geocode_cache')
      .upsert({ query_hash: queryHash, query_kind: kind, result }, { onConflict: 'query_hash' });
  } catch (e) {
    // Cache-write failures are non-fatal.
    console.error('geocode_cache write failed:', e);
  }
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  city: string;
  region?: string;
  country: string;
}

export interface CityGeocodeParams {
  city: string;
  region?: string;
  country: string;
}

// Place types we accept as a valid "city" match. Anything else (county, state,
// country, region) has a centroid far from where the user actually lives.
const CITY_LEVEL_ADDRESSTYPES = new Set([
  'city', 'town', 'village', 'hamlet', 'municipality',
  'suburb', 'neighbourhood', 'locality', 'isolated_dwelling',
]);
const NON_CITY_ADDRESSTYPES = new Set([
  'county', 'state', 'state_district', 'region', 'province',
  'country', 'continent',
]);

type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
  addresstype?: string;
  address?: Record<string, string>;
};

function pickCityHit(hits: unknown): NominatimHit | null {
  if (!Array.isArray(hits) || hits.length === 0) return null;
  const preferred = hits.find((h: NominatimHit) => CITY_LEVEL_ADDRESSTYPES.has(h.addresstype ?? ''));
  if (preferred) return preferred;
  return hits.find((h: NominatimHit) => !NON_CITY_ADDRESSTYPES.has(h.addresstype ?? '')) ?? null;
}

async function fetchNominatim(url: URL): Promise<unknown> {
  return pacedNominatim(async () => {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': NOMINATIM_UA },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) return null;
    return res.json();
  });
}

/**
 * Geocode a city to approximate coordinates.
 * Used for person entries and private-venue clubs.
 *
 * Uses Nominatim's structured query first (`city=`, `state=`, `country=`),
 * then filters out county/state/country matches so we never pin a person to a
 * county centroid — an issue that surfaced when "Jasper, GA" resolved to
 * Jasper County (south of Atlanta) instead of Jasper city (north of Atlanta).
 */
export async function geocodeCity(params: CityGeocodeParams): Promise<GeocodeResult | null> {
  const { city, region, country } = params;

  const queryHash = hashQuery('city', [city, region, country]);
  const cached = await readCache(queryHash);
  if (cached) return cached;

  const structured = new URL('https://nominatim.openstreetmap.org/search');
  structured.searchParams.set('city', city);
  if (region) structured.searchParams.set('state', region);
  structured.searchParams.set('country', country);
  structured.searchParams.set('format', 'json');
  structured.searchParams.set('limit', '5');
  structured.searchParams.set('addressdetails', '1');

  try {
    let hit = pickCityHit(await fetchNominatim(structured));

    if (!hit) {
      const freeform = new URL('https://nominatim.openstreetmap.org/search');
      const q = [city, region, country].filter(Boolean).join(', ');
      freeform.searchParams.set('q', q);
      freeform.searchParams.set('format', 'json');
      freeform.searchParams.set('limit', '5');
      freeform.searchParams.set('addressdetails', '1');
      freeform.searchParams.set('featuretype', 'city');
      hit = pickCityHit(await fetchNominatim(freeform));
    }

    if (!hit) return null;
    const result: GeocodeResult = {
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      displayName: hit.display_name,
      city: hit.address?.city || hit.address?.town || hit.address?.village || hit.address?.hamlet || city,
      region: hit.address?.state || hit.address?.region || region,
      country: hit.address?.country_code?.toUpperCase() || country,
    };
    await writeCache(queryHash, 'city', result);
    return result;
  } catch (e) {
    console.error('Geocode error:', e);
    return null;
  }
}

export interface AddressGeocodeParams {
  addressLine: string;
  city: string;
  region?: string;
  postalCode?: string;
  country: string;
}

/**
 * Geocode a street address to exact coordinates.
 * Used for shop entries and public-venue clubs.
 * Uses Nominatim's structured query for better accuracy.
 */
export async function geocodeAddress(params: AddressGeocodeParams): Promise<GeocodeResult | null> {
  const { addressLine, city, region, postalCode, country } = params;

  const queryHash = hashQuery('address', [addressLine, city, region, postalCode, country]);
  const cached = await readCache(queryHash);
  if (cached) return cached;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  // Use structured query for better accuracy
  url.searchParams.set('street', addressLine);
  url.searchParams.set('city', city);
  if (region) url.searchParams.set('state', region);
  if (postalCode) url.searchParams.set('postalcode', postalCode);
  url.searchParams.set('country', country);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');

  try {
    const data = await pacedNominatim(async () => {
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': NOMINATIM_UA },
        next: { revalidate: 60 * 60 * 24 * 7 },
      });
      if (!res.ok) return null;
      return res.json();
    });

    // If structured query fails, fall back to free-form query
    if (!Array.isArray(data) || data.length === 0) {
      const result = await geocodeAddressFreeform(params);
      if (result) await writeCache(queryHash, 'address', result);
      return result;
    }

    const hit = data[0];
    const result: GeocodeResult = {
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      displayName: hit.display_name,
      city: hit.address?.city || hit.address?.town || hit.address?.village || hit.address?.county || city,
      region: hit.address?.state || hit.address?.region || region,
      country: hit.address?.country_code?.toUpperCase() || country,
    };
    await writeCache(queryHash, 'address', result);
    return result;
  } catch (e) {
    console.error('Address geocode error:', e);
    return null;
  }
}

/**
 * Fallback free-form address geocoding when structured query fails.
 */
async function geocodeAddressFreeform(params: AddressGeocodeParams): Promise<GeocodeResult | null> {
  const { addressLine, city, region, postalCode, country } = params;
  
  // Build free-form query string
  const queryParts = [addressLine, city];
  if (region) queryParts.push(region);
  if (postalCode) queryParts.push(postalCode);
  queryParts.push(country);
  const query = queryParts.join(', ');

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');

  try {
    const data = await pacedNominatim(async () => {
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': NOMINATIM_UA },
        next: { revalidate: 60 * 60 * 24 * 7 },
      });
      if (!res.ok) return null;
      return res.json();
    });
    if (!Array.isArray(data) || data.length === 0) return null;

    const hit = data[0];
    return {
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      displayName: hit.display_name,
      city: hit.address?.city || hit.address?.town || hit.address?.village || hit.address?.county || city,
      region: hit.address?.state || hit.address?.region || region,
      country: hit.address?.country_code?.toUpperCase() || country,
    };
  } catch (e) {
    console.error('Address geocode freeform error:', e);
    return null;
  }
}

/**
 * Apply ~10mi jitter in application code as defense-in-depth.
 * The DB also jitters on insert; this gives us a belt-and-suspenders approach.
 */
export function jitterCoords(lat: number, lng: number): { lat: number; lng: number } {
  const maxOffsetDeg = 10 / 69; // ~10 miles in degrees latitude
  const r = maxOffsetDeg * Math.sqrt(Math.random());
  const theta = 2 * Math.PI * Math.random();
  const jitteredLat = lat + r * Math.cos(theta);
  const jitteredLng = lng + (r * Math.sin(theta)) / Math.cos((lat * Math.PI) / 180);
  return { lat: jitteredLat, lng: jitteredLng };
}
