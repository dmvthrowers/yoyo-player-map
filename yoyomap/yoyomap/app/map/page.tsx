import { Suspense } from 'react';
import MapClient from './MapClient';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 60; // ISR: refresh cached page every 60s

interface MapEntry {
  id: string;
  display_name: string;
  city: string;
  region: string | null;
  country: string;
  bio: string | null;
  socials: Record<string, string>;
  lat: number;
  lng: number;
  age_band: string;
}

async function getEntries(): Promise<MapEntry[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('map_entries')
      .select('id, display_name, city, region, country, bio, socials, lat, lng, age_band');
    if (error) {
      console.error('Failed to load map entries:', error);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.error('Map fetch error:', e);
    return [];
  }
}

export default async function MapPage() {
  const entries = await getEntries();
  return (
    <div className="h-[calc(100vh-180px)] relative">
      <div className="absolute top-4 left-4 z-[500] bg-cream border-2 border-navy p-3 max-w-xs shadow-lg">
        <p className="font-display text-xl mb-1">YoYo Map</p>
        <p className="text-xs text-navy/80 mb-2">
          <strong>{entries.length}</strong> yo-yoer{entries.length === 1 ? '' : 's'} on the map.
          Pins are blurred to a ~10 mile radius.
        </p>
        <a href="/submit" className="btn-primary text-xs py-2 px-3 w-full">Add yourself</a>
      </div>
      <Suspense fallback={<div className="p-8">Loading map…</div>}>
        <MapClient entries={entries} />
      </Suspense>
    </div>
  );
}
