
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { unstable_cache } from 'next/cache';
import { routing } from '@/i18n/routing';
import MapClient from './MapClient';
import MapInfoPanel from './MapInfoPanel';
import { supabase } from '@/lib/supabase';
import { MAP_TABLE } from '@/lib/supabase/client';


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'map' });
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
    alternates: { canonical: '/map' },
    openGraph: {
      title: t('pageTitle'),
      description: t('pageDescription'),
      url: '/map',
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}


// Edge cache/prerender flags (P0-1)
export const revalidate = 86400; // 24 hours edge cache
export const dynamic = 'force-static';
export const fetchCache = 'force-cache';
export const preferredRegion = 'iad1'; // us-east-1 (Supabase region)

// Lean shape shipped on initial page load — kept small to reduce Vercel
// bandwidth + Supabase egress. Bio, socials, hours, and other popup-only
// fields are fetched lazily from /api/entry/[id] when the user opens a popup.
export interface MapEntry {
  id: string;
  display_name: string;
  city: string;
  region: string | null;
  country: string;
  lat: number;
  lng: number;
  entity_type?: 'person' | 'shop' | 'club';
  verified_owner?: boolean | null;
}

// Full detail shape returned by /api/entry/[id] and rendered inside popups.
export interface MapEntryDetail extends MapEntry {
  bio: string | null;
  socials: Record<string, string>;
  address_line: string | null;
  postal_code: string | null;
  hours: string | null;
  club_meeting_info: string | null;
  club_venue_public: boolean | null;
}

// Only select columns needed for initial map render (P0-2)
// unstable_cache collapses all 11 locale variants into one Supabase query per
// revalidation cycle instead of firing 11 concurrent requests simultaneously.
// It throws on failure so an error is never cached as an empty map for 24h.
const getCachedEntries = unstable_cache(
  async (): Promise<MapEntry[]> => {
    const { data, error } = await supabase
      .from(MAP_TABLE)
      .select('id, display_name, city, region, country, lat, lng, entity_type, verified_owner');
    if (error) throw new Error(`map_entries query failed: ${error.message}`);
    return data ?? [];
  },
  ['map-entries'],
  { revalidate: 86400, tags: ['public-entries'] },
);

async function getEntries(): Promise<{ entries: MapEntry[]; failed: boolean }> {
  try {
    return { entries: await getCachedEntries(), failed: false };
  } catch (e) {
    console.error('Failed to load map entries:', e);
    return { entries: [], failed: true };
  }
}

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { entries, failed } = await getEntries();
  const t = await getTranslations({ locale });

  // Count by entity type
  const counts = {
    person: entries.filter((e) => e.entity_type === 'person').length,
    shop: entries.filter((e) => e.entity_type === 'shop').length,
    club: entries.filter((e) => e.entity_type === 'club').length,
  };

  return (
    <div className="h-[calc(100dvh-56px)] md:h-[calc(100dvh-88px)] relative isolate">
      <h1 className="sr-only">{t('map.pageTitle')}</h1>
      {failed && (
        <p role="alert" className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-white border border-red-600 text-red-700 text-sm px-4 py-2">
          {t('map.loadFailed')}
        </p>
      )}
      <MapInfoPanel counts={counts} />
      <Suspense fallback={<div className="p-8">Loading map...</div>}>
        <MapClient entries={entries} />
      </Suspense>
    </div>
  );
}
