'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { MapEntry } from './page';

export interface MapFilters {
  showPerson: boolean;
  showShop: boolean;
  showClub: boolean;
  showUnderserved: boolean;
}

// Dynamic import — Leaflet requires window, must not SSR
const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-navy text-cream">
      <p className="font-display text-2xl">Loading map...</p>
    </div>
  ),
});

export default function MapClient({ entries }: { entries: MapEntry[] }) {
  const [filters, setFilters] = useState<MapFilters>({
    showPerson: true,
    showShop: true,
    showClub: true,
    showUnderserved: false,
  });

  const memoEntries = useMemo(() => entries, [entries]);

  // Filter entries based on toggle state
  const filteredEntries = useMemo(() => {
    return memoEntries.filter((entry) => {
      if (entry.entity_type === 'person' && !filters.showPerson) return false;
      if (entry.entity_type === 'shop' && !filters.showShop) return false;
      if (entry.entity_type === 'club' && !filters.showClub) return false;
      return true;
    });
  }, [memoEntries, filters.showPerson, filters.showShop, filters.showClub]);

  const toggleFilter = (key: keyof MapFilters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      {/* Filter panel */}
      <div className="absolute top-4 right-4 z-[500] bg-cream border-2 border-navy p-3 shadow-lg">
        <p className="text-xs font-bold uppercase tracking-wider mb-2">Filter</p>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showPerson}
              onChange={() => toggleFilter('showPerson')}
            />
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-[#C8102E]" />
              People
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showShop}
              onChange={() => toggleFilter('showShop')}
            />
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-[#2E8B57]" />
              Shops
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showClub}
              onChange={() => toggleFilter('showClub')}
            />
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-[#1B2A49]" />
              Clubs
            </span>
          </label>
        </div>
        <hr className="my-2 border-navy/20" />
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showUnderserved}
            onChange={() => toggleFilter('showUnderserved')}
          />
          <span>Highlight underserved</span>
        </label>
        {filters.showUnderserved && (
          <p className="text-[10px] text-navy/60 mt-1">
            Pulsing ring = &gt;50mi from nearest shop and club
          </p>
        )}
      </div>

      <Map entries={filteredEntries} allEntries={memoEntries} filters={filters} />
    </>
  );
}
