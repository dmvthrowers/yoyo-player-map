
import { Suspense } from 'react';
import type { Metadata } from 'next';
import MapClient from './MapClient';
import MapInfoPanel from './MapInfoPanel';
import { supabase } from '@/lib/supabase';
import { MAP_TABLE } from '@/lib/supabase/client';


export const metadata: Metadata = {
  title: 'Yo-Yo Player Map — Find Throwers, Shops & Clubs Near You',
  description: 'Browse the global community map of yo-yo players, shops, and clubs. Privacy-first, opt-in, city-level locations only.',
  alternates: { canonical: '/map' },
  openGraph: {
    title: 'Yo-Yo Player Map',
    description: 'Find yo-yo players, shops, and clubs near you on a privacy-first community map.',
    url: '/map',
  },
};


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
async function getEntries(): Promise<MapEntry[]> {
  try {
    const { data, error } = await supabase
      .from(MAP_TABLE)
      .select('id, display_name, city, region, country, lat, lng, entity_type, verified_owner');
    if (error) {
      console.error('Failed to load map entries:', error);
      return [];
    }
    return (data ?? []);
  } catch (e) {
    console.error('Map fetch error:', e);
    return [];
  }
}

export default async function MapPage() {
  const entries = await getEntries();

  // Count by entity type
  const counts = {
    person: entries.filter((e) => e.entity_type === 'person').length,
    shop: entries.filter((e) => e.entity_type === 'shop').length,
    club: entries.filter((e) => e.entity_type === 'club').length,
  };

  return (
    <div className="h-[calc(100dvh-56px)] md:h-[calc(100dvh-88px)] relative">
      <MapInfoPanel counts={counts} />
      <Suspense fallback={<div className="p-8">Loading map...</div>}>
        <MapClient entries={entries} />
      </Suspense>
    </div>
  );
}
