// Region normalization map: maps known abbreviations/variants to canonical display name
export const REGION_NORMALIZATION: Record<string, string> = {
  // US states (add more as needed)
  al: 'Alabama',
  ak: 'Alaska',
  az: 'Arizona',
  ar: 'Arkansas',
  ca: 'California',
  co: 'Colorado',
  ct: 'Connecticut',
  de: 'Delaware',
  fl: 'Florida',
  ga: 'Georgia',
  hi: 'Hawaii',
  id: 'Idaho',
  il: 'Illinois',
  in: 'Indiana',
  ia: 'Iowa',
  ks: 'Kansas',
  ky: 'Kentucky',
  la: 'Louisiana',
  me: 'Maine',
  md: 'Maryland',
  ma: 'Massachusetts',
  mi: 'Michigan',
  mn: 'Minnesota',
  ms: 'Mississippi',
  mo: 'Missouri',
  mt: 'Montana',
  ne: 'Nebraska',
  nv: 'Nevada',
  nh: 'New Hampshire',
  nj: 'New Jersey',
  nm: 'New Mexico',
  ny: 'New York',
  nc: 'North Carolina',
  nd: 'North Dakota',
  oh: 'Ohio',
  ok: 'Oklahoma',
  or: 'Oregon',
  pa: 'Pennsylvania',
  ri: 'Rhode Island',
  sc: 'South Carolina',
  sd: 'South Dakota',
  tn: 'Tennessee',
  tx: 'Texas',
  ut: 'Utah',
  vt: 'Vermont',
  va: 'Virginia',
  wa: 'Washington',
  wv: 'West Virginia',
  wi: 'Wisconsin',
  wy: 'Wyoming',
  // Add more as needed
};

// Returns canonical display name for a region slug or raw name
export function canonicalRegionName(input: string | null | undefined): string {
  if (!input) return '';
  const slug = slugify(input);
  return REGION_NORMALIZATION[slug] || input;
}

// Returns true if a region name/slug is structurally invalid (numeric-only,
// too short, pure punctuation). Mirrors the DB CHECK constraint added in v18.
// Use this to refuse to render broken region pages on the public site even if
// junk somehow slips into the data layer.
export function isJunkRegion(input: string | null | undefined): boolean {
  if (input === null || input === undefined) return false; // null = "no region", not junk
  const trimmed = String(input).trim();
  if (trimmed.length < 2) return true;
  if (/^[0-9]+$/.test(trimmed)) return true;
  if (/^[\p{P}\s]+$/u.test(trimmed)) return true;
  return false;
}

// Country normalization map: maps all known codes/variants to canonical display name
const COUNTRY_NORMALIZATION: Record<string, string> = {
  // United States
  us: 'United States',
  usa: 'United States',
  "united-states": 'United States',
  // Canada
  ca: 'Canada',
  canada: 'Canada',
  // United Kingdom
  uk: 'United Kingdom',
  "united-kingdom": 'United Kingdom',
  gb: 'United Kingdom',
  "great-britain": 'United Kingdom',
  // New Zealand
  nz: 'New Zealand',
  "new-zealand": 'New Zealand',
  // Spain
  es: 'Spain',
  spain: 'Spain',
  // France
  fr: 'France',
  france: 'France',
  // Germany
  de: 'Germany',
  germany: 'Germany',
  // Brazil
  br: 'Brazil',
  brazil: 'Brazil',
  // Japan
  jp: 'Japan',
  japan: 'Japan',
  // Honduras
  hn: 'Honduras',
  honduras: 'Honduras',
  // Belgium
  be: 'Belgium',
  belgium: 'Belgium',
  // Ukraine
  ua: 'Ukraine',
  ukraine: 'Ukraine',
  // Hungary
  hu: 'Hungary',
  hungary: 'Hungary',
  // Czech Republic
  cz: 'Czech Republic',
  "czech-republic": 'Czech Republic',
  // Singapore
  sg: 'Singapore',
  singapore: 'Singapore',
  // Mexico
  mx: 'Mexico',
  mexico: 'Mexico',
  // United Arab Emirates
  ae: 'United Arab Emirates',
  "united-arab-emirates": 'United Arab Emirates',
  uae: 'United Arab Emirates',
  // Denmark
  dk: 'Denmark',
  denmark: 'Denmark',
  // Estonia
  ee: 'Estonia',
  estonia: 'Estonia',
  // Slovenia
  si: 'Slovenia',
  slovenia: 'Slovenia',
  // Australia
  au: 'Australia',
  australia: 'Australia',
  // Austria
  at: 'Austria',
  austria: 'Austria',
  // China
  cn: 'China',
  china: 'China',
  // Finland
  fi: 'Finland',
  finland: 'Finland',
  // India
  "in": 'India',
  india: 'India',
  // Indonesia
  id: 'Indonesia',
  indonesia: 'Indonesia',
  // Ireland
  ie: 'Ireland',
  ireland: 'Ireland',
  // Israel
  il: 'Israel',
  israel: 'Israel',
  // Italy
  it: 'Italy',
  italy: 'Italy',
  // Latvia
  lv: 'Latvia',
  latvia: 'Latvia',
  // Lithuania
  lt: 'Lithuania',
  lithuania: 'Lithuania',
  // Malaysia
  my: 'Malaysia',
  malaysia: 'Malaysia',
  // Netherlands
  nl: 'Netherlands',
  netherlands: 'Netherlands',
  // Norway
  no: 'Norway',
  norway: 'Norway',
  // Philippines
  ph: 'Philippines',
  philippines: 'Philippines',
  // Poland
  pl: 'Poland',
  poland: 'Poland',
  // Portugal
  pt: 'Portugal',
  portugal: 'Portugal',
  // Romania
  ro: 'Romania',
  romania: 'Romania',
  // Russia
  ru: 'Russia',
  russia: 'Russia',
  // South Korea
  kr: 'South Korea',
  "south-korea": 'South Korea',
  // Sweden
  se: 'Sweden',
  sweden: 'Sweden',
  // Switzerland
  ch: 'Switzerland',
  switzerland: 'Switzerland',
  // Taiwan
  tw: 'Taiwan',
  taiwan: 'Taiwan',
  // Thailand
  th: 'Thailand',
  thailand: 'Thailand',
  // Turkey
  tr: 'Turkey',
  turkey: 'Turkey',
};

// Returns canonical display name for a country slug or raw name
export function canonicalCountryName(input: string): string {
  const slug = slugify(input);
  return COUNTRY_NORMALIZATION[slug] || input;
}
import { supabase } from '@/lib/supabase';
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
export async function fetchAllPublicEntries(): Promise<PublicEntry[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.error('[locations] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
      return [];
    }
    const { data, error } = await supabase
      .from('map_entries')
      .select('id, display_name, city, region, country, bio, socials, entity_type, lat, lng');
    if (error) {
      console.error('[locations] failed to fetch entries — code:', error.code, '| message:', error.message, '| hint:', error.hint);
      return [];
    }
    if (!data || data.length === 0) {
      console.warn('[locations] fetchAllPublicEntries returned 0 entries — check Supabase RLS policies for the anon role on map_entries');
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
}

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
  // Expand URL abbreviations (e.g. 'nc' → 'north-carolina') so that either
  // form matches entries whose region is stored as the full name.
  const expandedRegionSlug = slugify(canonicalRegionName(regionSlug));
  return all.filter((e) => {
    const countryMatch = slugify(canonicalCountryName(e.country)) === countrySlug;
    const regionVariants = [e.region, canonicalRegionName(e.region)];
    return (
      countryMatch &&
      regionVariants.some((r) => slugify(r) === regionSlug || slugify(r) === expandedRegionSlug)
    );
  });
}


export async function entriesInCity(
  countrySlug: string,
  regionSlug: string,
  citySlug: string,
): Promise<PublicEntry[]> {
  const all = await fetchAllPublicEntries();
  // Expand URL abbreviations (e.g. 'nc' → 'north-carolina') so that either
  // form matches entries whose region is stored as the full name.
  const expandedRegionSlug = slugify(canonicalRegionName(regionSlug));
  return all.filter((e) => {
    const countryMatch = slugify(canonicalCountryName(e.country)) === countrySlug;
    const hasNoRegion = !e.region || e.region.trim() === '';
    const regionMatch =
      regionSlug === '_other'
        ? hasNoRegion
        : [e.region, canonicalRegionName(e.region)].some(
            (r) => slugify(r) === regionSlug || slugify(r) === expandedRegionSlug,
          );
    return countryMatch && regionMatch && slugify(e.city) === citySlug;
  });
}

// Resolve a slug back to canonical name (using the first matching entry).
export function canonicalName(entries: PublicEntry[], field: 'country' | 'region' | 'city'): string | null {
  const v = entries[0]?.[field];
  return v ?? null;
}
