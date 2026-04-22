import { Suspense } from 'react';
import MapClient from './MapClient';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 3600; // ISR: refresh cached page every hour (entries change rarely; saves Supabase egress + Vercel CPU)

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
  entity_type: 'person' | 'shop' | 'club';
  verified_owner: boolean | null;
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

async function getEntries(): Promise<MapEntry[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('map_entries')
      .select('id, display_name, city, region, country, lat, lng, entity_type, verified_owner');
    if (error) {
      console.error('Failed to load map entries:', error);
      return [];
    }
    // Default entity_type to 'person' for legacy entries without the field
    return (data ?? []).map((entry) => ({
      ...entry,
      entity_type: entry.entity_type || 'person',
    }));
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
    <div className="h-[calc(100vh-180px)] relative">
      <div className="absolute top-4 left-4 z-[500] bg-cream border-2 border-navy p-3 max-w-xs shadow-lg">
        <p className="font-display text-xl mb-1">YoYo Map</p>
        <p className="text-xs text-navy/80 mb-2">
          <strong>{counts.person}</strong> thrower{counts.person === 1 ? '' : 's'} 
          {counts.shop > 0 && <>, <strong>{counts.shop}</strong> shop{counts.shop === 1 ? '' : 's'}</>}
          {counts.club > 0 && <>, <strong>{counts.club}</strong> club{counts.club === 1 ? '' : 's'}</>}
        </p>
        <p className="text-[10px] text-navy/60 mb-2">
          People pins are blurred ~10mi. Shops and public club venues show exact locations.
        </p>
        <a href="/submit" className="btn-primary text-xs py-2 px-3 w-full">Add to the map</a>
      </div>
      <Suspense fallback={<div className="p-8">Loading map...</div>}>
        <MapClient entries={entries} />
      </Suspense>
    </div>
  );
}
