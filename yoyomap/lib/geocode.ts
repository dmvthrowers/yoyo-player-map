/**
 * Geocoding via Nominatim (OpenStreetMap). Free, no API key.
 * We only use this server-side and respect Nominatim's 1 req/sec policy.
 * Docs: https://nominatim.org/release-docs/latest/api/Search/
 *
 * IMPORTANT: Nominatim's ToS requires a valid User-Agent with contact info.
 */

const NOMINATIM_UA = 'DMVThrowersYoYoMap/1.0 (dmvthrowers@gmail.com)';

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
  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': NOMINATIM_UA },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) return null;
  return res.json();
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
    return {
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      displayName: hit.display_name,
      city: hit.address?.city || hit.address?.town || hit.address?.village || hit.address?.hamlet || city,
      region: hit.address?.state || hit.address?.region || region,
      country: hit.address?.country_code?.toUpperCase() || country,
    };
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
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': NOMINATIM_UA },
      // Cache for 7 days — addresses don't change often
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    
    // If structured query fails, fall back to free-form query
    if (!Array.isArray(data) || data.length === 0) {
      return geocodeAddressFreeform(params);
    }
    
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
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': NOMINATIM_UA },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) return null;
    const data = await res.json();
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
