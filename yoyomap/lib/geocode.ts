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

/**
 * Geocode a city name to approximate coordinates.
 * Used for person entries and private-venue clubs.
 */
export async function geocodeCity(query: string): Promise<GeocodeResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('featuretype', 'city');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': NOMINATIM_UA },
      // Cache for 7 days — city coords don't change
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
      city: hit.address?.city || hit.address?.town || hit.address?.village || hit.address?.county || query,
      region: hit.address?.state || hit.address?.region,
      country: hit.address?.country_code?.toUpperCase() || 'US',
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
