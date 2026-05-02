import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { apiUrl } from "../lib/api";

export interface MapEntry {
  id: string;
  display_name: string;
  city: string;
  region: string | null;
  country: string;
  lat: number;
  lng: number;
  entity_type?: "person" | "shop" | "club";
  verified_owner?: boolean | null;
}

const MapClient = lazy(() => import("../components/MapClient"));

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function MapPage() {
  const [entries, setEntries] = useState<MapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPeople, setShowPeople] = useState(true);
  const [showShops, setShowShops] = useState(true);
  const [showClubs, setShowClubs] = useState(true);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/api/map/entries"))
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setError("Failed to load map entries."))
      .finally(() => setLoading(false));
  }, []);

  const COMBINING_MARKS = /[\u0300-\u036f]/g;
  function fold(s: string | null | undefined): string {
    if (!s) return "";
    return s.normalize("NFKD").replace(COMBINING_MARKS, "").toLowerCase();
  }

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (e.entity_type === "person" && !showPeople) return false;
      if (e.entity_type === "shop" && !showShops) return false;
      if (e.entity_type === "club" && !showClubs) return false;
      if (search) {
        const q = fold(search);
        const fields = [fold(e.display_name), fold(e.city), fold(e.region), fold(e.country)];
        if (!fields.some((f) => f.includes(q))) return false;
      }
      return true;
    });
  }, [entries, showPeople, showShops, showClubs, search]);

  const counts = useMemo(
    () => ({
      person: entries.filter((e) => e.entity_type === "person").length,
      shop: entries.filter((e) => e.entity_type === "shop").length,
      club: entries.filter((e) => e.entity_type === "club").length,
    }),
    [entries],
  );

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      <div className="flex flex-1 overflow-hidden">
        <aside
          className="flex-shrink-0 overflow-y-auto border-r"
          style={{
            width: filtersOpen ? 280 : 48,
            transition: "width 0.2s",
            borderColor: "#d4cebc",
            backgroundColor: "#f5f0e8",
          }}
        >
          {filtersOpen ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-sm uppercase tracking-wider" style={{ color: "#0e1833" }}>Filters</p>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="text-xs"
                  style={{ color: "#6a7a9a" }}
                  aria-label="Collapse filters"
                >
                  ‹
                </button>
              </div>

              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6a7a9a" }}>
                  <SearchIcon />
                </span>
                <input
                  type="search"
                  className="input pl-9 text-sm"
                  placeholder="Search name, city…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search players, shops, and clubs"
                />
              </div>

              <div className="space-y-2 mb-6">
                {[
                  { label: "Players", value: showPeople, setter: setShowPeople, color: "#3b82f6" },
                  { label: "Shops", value: showShops, setter: setShowShops, color: "#D42B2B" },
                  { label: "Clubs", value: showClubs, setter: setShowClubs, color: "#22c55e" },
                ].map(({ label, value, setter, color }) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setter(e.target.checked)}
                      className="accent-brand-red"
                    />
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <div className="pt-3 border-t text-xs" style={{ borderColor: "#d4cebc", color: "#3a4a6a" }}>
                <p className="mb-1">
                  <strong>{counts.person}</strong> players · <strong>{counts.shop}</strong> shops · <strong>{counts.club}</strong> clubs
                </p>
                <p style={{ color: "#6a7a9a" }}>
                  {filtered.length} visible
                </p>
              </div>

              <div className="pt-4 mt-4 border-t text-xs space-y-1" style={{ borderColor: "#d4cebc" }}>
                <p className="font-bold uppercase tracking-wider mb-2" style={{ color: "#0e1833" }}>Legend</p>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#3b82f6" }} /><span>Player</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#D42B2B" }} /><span>Shop</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#22c55e" }} /><span>Club</span></div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center pt-4 gap-3">
              <button
                onClick={() => setFiltersOpen(true)}
                style={{ color: "#6a7a9a" }}
                aria-label="Expand filters"
                className="text-sm"
              >
                ›
              </button>
              <span className="text-xs" style={{ color: "#6a7a9a", writingMode: "vertical-rl" }}>Filters</span>
            </div>
          )}
        </aside>

        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "#f5f0e8", zIndex: 10 }}>
              <p className="text-sm" style={{ color: "#6a7a9a" }}>Loading map…</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm" style={{ color: "#D42B2B" }}>{error}</p>
            </div>
          )}
          {!loading && !error && (
            <Suspense fallback={<div className="flex items-center justify-center h-full text-sm" style={{ color: "#6a7a9a" }}>Loading map…</div>}>
              <MapClient entries={filtered} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
