import crypto from "crypto";
import { db } from "@workspace/db";
import { geocodeCacheTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const NOMINATIM_UA = "DMVThrowersYoYoMap/1.0 (contact@dmvthrowers.club)";
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

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hashQuery(kind: "city" | "address", parts: (string | undefined)[]): string {
  const normalized = parts
    .map((p) => (p ?? "").trim().toLowerCase())
    .join("|");
  return sha256Hex(`${kind}:${normalized}`);
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  city: string;
  region?: string;
  country: string;
}

async function readCache(queryHash: string): Promise<GeocodeResult | null> {
  try {
    const rows = await db
      .select({ result: geocodeCacheTable.result })
      .from(geocodeCacheTable)
      .where(eq(geocodeCacheTable.query_hash, queryHash))
      .limit(1);
    if (!rows.length || !rows[0].result) return null;
    console.log("geocode_cache hit:", queryHash.slice(0, 8));
    return rows[0].result as unknown as GeocodeResult;
  } catch {
    return null;
  }
}

async function writeCache(
  queryHash: string,
  kind: "city" | "address",
  result: GeocodeResult,
): Promise<void> {
  try {
    await db
      .insert(geocodeCacheTable)
      .values({ query_hash: queryHash, query_kind: kind, result: result as unknown as Record<string, unknown> })
      .onConflictDoUpdate({
        target: geocodeCacheTable.query_hash,
        set: { result: result as unknown as Record<string, unknown> },
      });
  } catch (e) {
    console.error("geocode_cache write failed:", e);
  }
}

type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
  addresstype?: string;
  address?: Record<string, string>;
};

const CITY_LEVEL = new Set([
  "city", "town", "village", "hamlet", "municipality",
  "suburb", "neighbourhood", "locality", "isolated_dwelling",
]);
const NON_CITY = new Set([
  "county", "state_district", "region", "province", "country", "continent",
]);

function pickCityHit(hits: unknown): NominatimHit | null {
  if (!Array.isArray(hits) || hits.length === 0) return null;
  const preferred = hits.find((h: NominatimHit) => CITY_LEVEL.has(h.addresstype ?? ""));
  if (preferred) return preferred;
  return hits.find((h: NominatimHit) => !NON_CITY.has(h.addresstype ?? "")) ?? null;
}

async function fetchNominatim(url: URL): Promise<unknown | null> {
  return pacedNominatim(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url.toString(), {
        headers: { "User-Agent": NOMINATIM_UA },
        signal: controller.signal,
      });
      if (res.status === 429) {
        console.warn("Nominatim rate limited");
        return null;
      }
      if (!res.ok) {
        console.error(`Nominatim error ${res.status}`);
        return null;
      }
      return res.json();
    } catch (e) {
      console.error("Nominatim fetch failed:", e);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  });
}

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    postcode?: string;
    osm_value?: string;
  };
};

async function fetchPhoton(q: string, limit = 5): Promise<PhotonFeature[] | null> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(limit));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      console.error(`Photon error ${res.status}`);
      return null;
    }
    const data = await res.json() as { features?: unknown[] };
    if (!Array.isArray(data?.features)) return null;
    return data.features as PhotonFeature[];
  } catch (e) {
    console.error("Photon fetch failed:", e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function photonFeatureToResult(
  feature: PhotonFeature,
  fallbackCity: string,
  fallbackRegion?: string,
  fallbackCountry?: string,
): GeocodeResult {
  const [lng, lat] = feature.geometry.coordinates;
  const p = feature.properties;
  const cityName = p.city || p.town || p.village || p.name || fallbackCity;
  const countryCode = p.countrycode?.toUpperCase() || fallbackCountry || "";
  return {
    lat,
    lng,
    displayName: [p.name, p.state, p.country].filter(Boolean).join(", ") || fallbackCity,
    city: cityName,
    region: p.state || fallbackRegion,
    country: countryCode,
  };
}

export interface CityGeocodeParams {
  city: string;
  region?: string;
  country: string;
}

export async function geocodeCity(
  params: CityGeocodeParams,
): Promise<GeocodeResult | null> {
  const { city, region, country } = params;
  const queryHash = hashQuery("city", [city, region, country]);
  const cached = await readCache(queryHash);
  if (cached) return cached;

  const structured = new URL("https://nominatim.openstreetmap.org/search");
  structured.searchParams.set("city", city);
  if (region) structured.searchParams.set("state", region);
  structured.searchParams.set("country", country);
  structured.searchParams.set("format", "json");
  structured.searchParams.set("limit", "5");
  structured.searchParams.set("addressdetails", "1");

  try {
    let hit = pickCityHit(await fetchNominatim(structured));
    if (!hit) {
      const freeform = new URL("https://nominatim.openstreetmap.org/search");
      freeform.searchParams.set("q", [city, region, country].filter(Boolean).join(", "));
      freeform.searchParams.set("format", "json");
      freeform.searchParams.set("limit", "5");
      freeform.searchParams.set("addressdetails", "1");
      freeform.searchParams.set("featuretype", "city");
      hit = pickCityHit(await fetchNominatim(freeform));
    }

    if (hit) {
      const result: GeocodeResult = {
        lat: parseFloat(hit.lat),
        lng: parseFloat(hit.lon),
        displayName: hit.display_name,
        city: hit.address?.city || hit.address?.town || hit.address?.village || hit.address?.hamlet || city,
        region: hit.address?.state || hit.address?.region || region,
        country: hit.address?.country_code?.toUpperCase() || country,
      };
      await writeCache(queryHash, "city", result);
      return result;
    }

    console.warn("geocode_city: Nominatim returned no results, trying Photon fallback");
    const q = [city, region, country].filter(Boolean).join(", ");
    const features = await fetchPhoton(q, 5);
    if (features && features.length > 0) {
      const result = photonFeatureToResult(features[0], city, region, country);
      console.log("geocode_city: Photon fallback succeeded for", q);
      await writeCache(queryHash, "city", result);
      return result;
    }

    console.error("geocode_city: both Nominatim and Photon failed for", city, region, country);
    return null;
  } catch (e) {
    console.error("Geocode error:", e);
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

export async function geocodeAddress(
  params: AddressGeocodeParams,
): Promise<GeocodeResult | null> {
  const { addressLine, city, region, postalCode, country } = params;
  const queryHash = hashQuery("address", [addressLine, city, region, postalCode, country]);
  const cached = await readCache(queryHash);
  if (cached) return cached;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("street", addressLine);
  url.searchParams.set("city", city);
  if (region) url.searchParams.set("state", region);
  if (postalCode) url.searchParams.set("postalcode", postalCode);
  url.searchParams.set("country", country);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  try {
    const data = await fetchNominatim(url);
    if (Array.isArray(data) && data.length > 0) {
      const hit = data[0];
      const result: GeocodeResult = {
        lat: parseFloat(hit.lat),
        lng: parseFloat(hit.lon),
        displayName: hit.display_name,
        city: hit.address?.city || hit.address?.town || hit.address?.village || city,
        region: hit.address?.state || region,
        country: hit.address?.country_code?.toUpperCase() || country,
      };
      await writeCache(queryHash, "address", result);
      return result;
    }

    const qp = [addressLine, city];
    if (region) qp.push(region);
    if (postalCode) qp.push(postalCode);
    qp.push(country);
    const ff = new URL("https://nominatim.openstreetmap.org/search");
    ff.searchParams.set("q", qp.join(", "));
    ff.searchParams.set("format", "json");
    ff.searchParams.set("limit", "1");
    ff.searchParams.set("addressdetails", "1");
    const ffData = await fetchNominatim(ff);
    if (Array.isArray(ffData) && ffData.length > 0) {
      const hit = ffData[0];
      const result: GeocodeResult = {
        lat: parseFloat(hit.lat),
        lng: parseFloat(hit.lon),
        displayName: hit.display_name,
        city: hit.address?.city || hit.address?.town || city,
        region: hit.address?.state || region,
        country: hit.address?.country_code?.toUpperCase() || country,
      };
      await writeCache(queryHash, "address", result);
      return result;
    }

    console.warn("geocode_address: Nominatim returned no results, trying Photon fallback");
    const q = qp.join(", ");
    const features = await fetchPhoton(q, 1);
    if (features && features.length > 0) {
      const result = photonFeatureToResult(features[0], city, region, country);
      console.log("geocode_address: Photon fallback succeeded for", q);
      await writeCache(queryHash, "address", result);
      return result;
    }

    console.error("geocode_address: both Nominatim and Photon failed for", qp.join(", "));
    return null;
  } catch (e) {
    console.error("Address geocode error:", e);
    return null;
  }
}
