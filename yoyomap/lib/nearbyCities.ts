import { fetchAllPublicEntries } from './locations';
import { slugify } from './locationSlug';
import { haversineMiles } from './geo';

export interface CityCentroid {
  countrySlug: string;
  regionSlug: string;
  citySlug: string;
  countryName: string;
  regionName: string;
  cityName: string;
  lat: number;
  lng: number;
  entryCount: number;
  shopCount: number;
  clubCount: number;
}

export interface NearbyCity extends CityCentroid {
  distanceMi: number;
}

// Aggregate every entry into one record per (country, region, city), centered
// at the mean lat/lng of its members. Cities whose entries have no coordinates
// are excluded — we can't measure distance to them.
async function buildCityCentroids(): Promise<CityCentroid[]> {
  const entries = await fetchAllPublicEntries();
  const buckets = new Map<string, {
    countrySlug: string; regionSlug: string; citySlug: string;
    countryName: string; regionName: string; cityName: string;
    latSum: number; lngSum: number; coordCount: number;
    entryCount: number; shopCount: number; clubCount: number;
  }>();

  for (const e of entries) {
    if (!e.region) continue; // city pages only exist under a region
    const countrySlug = slugify(e.country);
    const regionSlug = slugify(e.region);
    const citySlug = slugify(e.city);
    const key = `${countrySlug}|${regionSlug}|${citySlug}`;
    let b = buckets.get(key);
    if (!b) {
      b = {
        countrySlug, regionSlug, citySlug,
        countryName: e.country, regionName: e.region, cityName: e.city,
        latSum: 0, lngSum: 0, coordCount: 0,
        entryCount: 0, shopCount: 0, clubCount: 0,
      };
      buckets.set(key, b);
    }
    b.entryCount += 1;
    if (e.entity_type === 'shop') b.shopCount += 1;
    if (e.entity_type === 'club') b.clubCount += 1;
    if (e.lat != null && e.lng != null) {
      b.latSum += e.lat;
      b.lngSum += e.lng;
      b.coordCount += 1;
    }
  }

  const out: CityCentroid[] = [];
  for (const b of buckets.values()) {
    if (b.coordCount === 0) continue;
    out.push({
      countrySlug: b.countrySlug,
      regionSlug: b.regionSlug,
      citySlug: b.citySlug,
      countryName: b.countryName,
      regionName: b.regionName,
      cityName: b.cityName,
      lat: b.latSum / b.coordCount,
      lng: b.lngSum / b.coordCount,
      entryCount: b.entryCount,
      shopCount: b.shopCount,
      clubCount: b.clubCount,
    });
  }
  return out;
}

/**
 * Compute a sortable score for a candidate city. LOWER scores rank higher
 * (think "effective distance"). Pure distance ranking is the safe default,
 * but in dense metros (e.g., the Bay Area) raw nearest cities can be tiny
 * suburbs with one entry each — sometimes you'd rather surface a slightly
 * farther city that has a real community.
 *
 * TODO(user): implement this. See the request below the file.
 */
export type RankNearbyCities = (
  candidate: CityCentroid,
  distanceMi: number,
) => number;

export async function nearbyCities(
  countrySlug: string,
  regionSlug: string,
  citySlug: string,
  rank: RankNearbyCities,
  opts: { limit?: number; maxDistanceMi?: number } = {},
): Promise<NearbyCity[]> {
  const { limit = 6, maxDistanceMi = 250 } = opts;
  const centroids = await buildCityCentroids();
  const self = centroids.find(
    (c) => c.countrySlug === countrySlug && c.regionSlug === regionSlug && c.citySlug === citySlug,
  );
  if (!self) return [];

  const scored: Array<NearbyCity & { score: number }> = [];
  for (const c of centroids) {
    if (c === self) continue;
    const d = haversineMiles(self.lat, self.lng, c.lat, c.lng);
    if (d > maxDistanceMi) continue;
    scored.push({ ...c, distanceMi: d, score: rank(c, d) });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map(({ score: _s, ...rest }) => rest);
}
