// Country normalization map: maps all known codes/variants to canonical display name
const COUNTRY_NORMALIZATION: Record<string, string> = {
  us: 'United States',
  usa: 'United States',
  "united-states": 'United States',
  ca: 'Canada',
  canada: 'Canada',
  uk: 'United Kingdom',
  "united-kingdom": 'United Kingdom',
  gb: 'United Kingdom',
  nz: 'New Zealand',
  "new-zealand": 'New Zealand',
  es: 'Spain',
  spain: 'Spain',
  fr: 'France',
  france: 'France',
  de: 'Germany',
  germany: 'Germany',
  br: 'Brazil',
  brazil: 'Brazil',
  jp: 'Japan',
  japan: 'Japan',
  hn: 'Honduras',
  honduras: 'Honduras',
  be: 'Belgium',
  belgium: 'Belgium',
  ua: 'Ukraine',
  ukraine: 'Ukraine',
  hu: 'Hungary',
  hungary: 'Hungary',
  cz: 'Czech Republic',
  "czech-republic": 'Czech Republic',
  sg: 'Singapore',
  singapore: 'Singapore',
  mx: 'Mexico',
  mexico: 'Mexico',
  // Add more as needed
};

// Returns canonical display name for a country slug or raw name
export function canonicalCountryName(input: string): string {
  const slug = slugify(input);
  return COUNTRY_NORMALIZATION[slug] || input;
}
import { cache } from 'react';
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin';
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
  if (!hasAdminCredentials()) {
    console.warn('[locations] admin Supabase env vars missing, returning empty dataset');
    return [];
  }

  try {
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
  } catch (e) {
    console.error('[locations] fetch failed, returning empty dataset:', e);
    return [];
  }
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
  return all.filter((e) => slugify(canonicalCountryName(e.country)) === countrySlug);
}


export async function entriesInRegion(
  countrySlug: string,
  regionSlug: string,
): Promise<PublicEntry[]> {
  const all = await fetchAllPublicEntries();
  return all.filter(
    (e) => slugify(canonicalCountryName(e.country)) === countrySlug && slugify(e.region) === regionSlug,
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
      slugify(canonicalCountryName(e.country)) === countrySlug &&
      slugify(e.region) === regionSlug &&
      slugify(e.city) === citySlug,
  );
}

// Resolve a slug back to canonical name (using the first matching entry).
export function canonicalName(entries: PublicEntry[], field: 'country' | 'region' | 'city'): string | null {
  const v = entries[0]?.[field];
  return v ?? null;
}
