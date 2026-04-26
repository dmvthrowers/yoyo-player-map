'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState, useEffect } from 'react';
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
  const [filterOpen, setFilterOpen] = useState(true);

  useEffect(() => {
    if (window.innerWidth < 768) setFilterOpen(false);
  }, []);

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
      <div className="absolute bottom-4 right-4 z-[500] bg-cream border-2 border-navy shadow-lg">
        <button
          onClick={() => setFilterOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-2 w-full text-left"
          aria-expanded={filterOpen}
          aria-label={filterOpen ? 'Collapse filters' : 'Expand filters'}
        >
          <span className="text-xs font-bold uppercase tracking-wider flex-1">Filter</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`flex-shrink-0 text-navy/50 transition-transform ${filterOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {filterOpen && (
          <div className="px-3 pb-3 border-t border-navy/10">
            <div className="space-y-1 mt-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showPerson}
                  onChange={() => toggleFilter('showPerson')}
                />
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-[#D42B2B]" />
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
        )}
      </div>

      <Map entries={filteredEntries} allEntries={memoEntries} filters={filters} />
    </>
  );
}
