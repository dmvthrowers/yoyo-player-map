import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { slugify } from './locationSlug';

export interface PublicEntry {
  id: string;
  display_name: string;
  city: string;
  region: string | null;
  country: string;
  bio: string | null;
  socials: Record<string, string>;
  entity_type: 'person' | 'shop' | 'club';
  lat: number | null;
  lng: number | null;
}

// React cache() dedupes within a single render pass — so country/region/city
// pages that all call this only hit Supabase once per request lifecycle.
// Combined with ISR (revalidate=3600) the cost is ~1 query per hour per page.
export const fetchAllPublicEntries = cache(async (): Promise<PublicEntry[]> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('map_entries')
    .select('id, display_name, city, region, country, bio, socials, entity_type, lat, lng');
  if (error) {
    console.error('[locations] failed to fetch entries:', error);
    return [];
  }
  return (data ?? []).map((e) => ({
    ...e,
    entity_type: (e.entity_type ?? 'person') as PublicEntry['entity_type'],
    socials: e.socials ?? {},
    lat: e.lat ?? null,
    lng: e.lng ?? null,
  }));
});

export interface LocationKey {
  country: string;
  region: string | null;
  city: string;
}

// Distinct (country, region, city) combos with their canonical casing.
export async function listLocations(): Promise<LocationKey[]> {
  const entries = await fetchAllPublicEntries();
  const seen = new Map<string, LocationKey>();
  for (const e of entries) {
    const key = `${e.country}|${e.region ?? ''}|${e.city}`;
    if (!seen.has(key)) {
      seen.set(key, { country: e.country, region: e.region, city: e.city });
    }
  }
  return [...seen.values()];
}

export async function entriesInCountry(countrySlug: string): Promise<PublicEntry[]> {
  const all = await fetchAllPublicEntries();
  return all.filter((e) => slugify(e.country) === countrySlug);
}

export async function entriesInRegion(
  countrySlug: string,
  regionSlug: string,
): Promise<PublicEntry[]> {
  const all = await fetchAllPublicEntries();
  return all.filter(
    (e) => slugify(e.country) === countrySlug && slugify(e.region) === regionSlug,
  );
}

export async function entriesInCity(
  countrySlug: string,
  regionSlug: string,
  citySlug: string,
): Promise<PublicEntry[]> {
  const all = await fetchAllPublicEntries();
  return all.filter(
    (e) =>
      slugify(e.country) === countrySlug &&
      slugify(e.region) === regionSlug &&
      slugify(e.city) === citySlug,
  );
}

// Resolve a slug back to canonical name (using the first matching entry).
export function canonicalName(entries: PublicEntry[], field: 'country' | 'region' | 'city'): string | null {
  const v = entries[0]?.[field];
  return v ?? null;
}
