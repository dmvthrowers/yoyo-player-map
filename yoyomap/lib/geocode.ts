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

// Edge-compatible SHA-256 hash using Web Crypto API
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
import { z } from 'zod';
import { createAdminClient } from './supabase/admin';

const NOMINATIM_UA = 'DMVThrowersYoYoMap/1.0 (contact@dmvthrowers.club)';

// Lazy singleton — defers createAdminClient() until first geocode call so a
// missing SUPABASE_SERVICE_ROLE_KEY doesn't crash unrelated API routes at import.
let _supabaseAdmin: ReturnType<typeof createAdminClient> | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) _supabaseAdmin = createAdminClient();
  return _supabaseAdmin;
}

// ---------------------------------------------------------------------------
// Rate limiter: serialize Nominatim requests, min 1100ms between starts.
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
async function hashQuery(kind: 'city' | 'address', parts: (string | undefined)[]): Promise<string> {
  const normalized = parts
    .map((p) => (p ?? '').trim().toLowerCase())
    .join('|');
  return sha256Hex(`${kind}:${normalized}`);
}

const GeocodeResultSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  displayName: z.string(),
  city: z.string(),
  region: z.string().optional(),
  country: z.string(),
});

export interface GeocodeResult extends z.infer<typeof GeocodeResultSchema> {}

async function readCache(queryHash: string): Promise<GeocodeResult | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
     .from('geocode_cache')
     .select('result')
     .eq('query_hash', queryHash)
     .maybeSingle();
    if (error ||!data) return null;

    const parsed = GeocodeResultSchema.safeParse(data.result);
    return parsed.success? parsed.data : null;
  } catch {
    return null;
  }
}

async function writeCache(queryHash: string, kind: 'city' | 'address', result: GeocodeResult): Promise<void> {
  try {
    await getSupabaseAdmin()
     .from('geocode_cache')
     .upsert({ query_hash: queryHash, query_kind: kind, result }, { onConflict: 'query_hash' });
  } catch (e) {
    console.error('geocode_cache write failed:', e);
  }
}

export interface CityGeocodeParams {
  city: string;
  region?: string;
  country: string;
}

const CITY_LEVEL_ADDRESSTYPES = new Set([
  'city', 'town', 'village', 'hamlet', 'municipality',
  'suburb', 'neighbourhood', 'locality', 'isolated_dwelling',
  'administrative', // city-states (e.g. Berlin, Singapore) come back as administrative
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
  return hits.find((h: NominatimHit) => CITY_LEVEL_ADDRESSTYPES.has(h.addresstype ?? '')) ?? null;
}

async function fetchNominatim(url: URL): Promise<unknown | null> {
  return pacedNominatim(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': NOMINATIM_UA },
        signal: controller.signal,
        cache: 'no-store', // we use Supabase cache, not Next's
      });

      if (res.status === 429) {
        console.warn('Nominatim rate limited - consider adding Redis');
        return null;
      }
      if (!res.ok) {
        console.error(`Nominatim error ${res.status} for ${url.pathname}`);
        return null;
      }
      return res.json();
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        console.error('Nominatim timeout for', url.toString());
      } else {
        console.error('Nominatim fetch failed:', e);
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  });
}

export async function geocodeCity(params: CityGeocodeParams): Promise<GeocodeResult | null> {
  const { city, region, country } = params;

  const queryHash = await hashQuery('city', [city, region, country]);
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
      // Do not set featuretype=city: city-states (Berlin, Singapore) are
      // returned as addresstype "administrative" and would be excluded.
      // pickCityHit handles filtering to settlement-level types.
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

export async function geocodeAddress(params: AddressGeocodeParams): Promise<GeocodeResult | null> {
  const { addressLine, city, region, postalCode, country } = params;

  const queryHash = await hashQuery('address', [addressLine, city, region, postalCode, country]);
  const cached = await readCache(queryHash);
  if (cached) return cached;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('street', addressLine);
  url.searchParams.set('city', city);
  if (region) url.searchParams.set('state', region);
  if (postalCode) url.searchParams.set('postalcode', postalCode);
  url.searchParams.set('country', country);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');

  try {
    const data = await fetchNominatim(url);

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

async function geocodeAddressFreeform(params: AddressGeocodeParams): Promise<GeocodeResult | null> {
  const { addressLine, city, region, postalCode, country } = params;

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
    const data = await fetchNominatim(url);
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
 * NOTE: If you're jittering in Postgres too, consider disabling one to avoid ~20mi total offset.
 */
export function jitterCoords(lat: number, lng: number): { lat: number; lng: number } {
  const miles = 10;
  const r = (miles * Math.sqrt(Math.random())) / 69; // uniform distribution in disk
  const theta = 2 * Math.PI * Math.random();
  const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180)); // clamp to avoid pole blowup
  const jitteredLat = lat + r * Math.cos(theta);
  const jitteredLng = lng + (r * Math.sin(theta)) / cosLat;
  return { lat: jitteredLat, lng: jitteredLng };
}