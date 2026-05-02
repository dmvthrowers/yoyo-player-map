import { useState, useEffect, useMemo, useDeferredValue } from "react";
import { Link } from "wouter";
import { apiUrl } from "../lib/api";

interface Entry {
  id: string;
  display_name: string;
  city: string;
  region: string | null;
  country: string;
  entity_type: "person" | "shop" | "club";
}

type EntityFilter = "all" | "person" | "shop" | "club";

const TYPE_LABEL: Record<Entry["entity_type"], string> = {
  person: "Thrower",
  shop: "Shop",
  club: "Club",
};

const COMBINING_MARKS = /[\u0300-\u036f]/g;
function fold(s: string | null | undefined): string {
  if (!s) return "";
  return s.normalize("NFKD").replace(COMBINING_MARKS, "").toLowerCase();
}

export default function PlayersPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<EntityFilter>("all");
  const [country, setCountry] = useState("all");
  const [region, setRegion] = useState("all");

  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    fetch(apiUrl("/api/map/entries"))
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) if (e.country) set.add(e.country);
    return [...set].sort();
  }, [entries]);

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (country !== "all" && e.country !== country) continue;
      if (e.region) set.add(e.region);
    }
    return [...set].sort();
  }, [entries, country]);

  const filtered = useMemo(() => {
    return entries
      .filter((e) => type === "all" || e.entity_type === type)
      .filter((e) => country === "all" || e.country === country)
      .filter((e) => region === "all" || e.region === region)
      .filter((e) => {
        if (!deferredQuery) return true;
        const words = fold(deferredQuery).split(/\s+/).filter(Boolean);
        const fields = [fold(e.display_name), fold(e.city), fold(e.region), fold(e.country)];
        return words.every((w) => fields.some((f) => f.includes(w)));
      })
      .sort((a, b) => a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" }));
  }, [entries, type, country, region, deferredQuery]);

  const isFiltered = query !== "" || type !== "all" || country !== "all" || region !== "all";

  function clearFilters() {
    setQuery("");
    setType("all");
    setCountry("all");
    setRegion("all");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <p className="eyebrow mb-2">Directory</p>
      <h1 className="text-4xl mb-2" style={{ color: "#0e1833", fontFamily: "Georgia, serif" }}>Yo-Yo Players Worldwide</h1>
      <p className="mb-8" style={{ color: "#3a4a6a" }}>Browse players, shops, and clubs from around the world.</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <label className="block sm:col-span-2 lg:col-span-2">
          <span className="sr-only">Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, city, region, or country…"
            className="input w-full"
          />
        </label>
        <label className="block">
          <span className="sr-only">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EntityFilter)}
            className="input w-full"
            title="Filter by type"
          >
            <option value="all">Type: All</option>
            <option value="person">Throwers</option>
            <option value="shop">Shops</option>
            <option value="club">Clubs</option>
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Country</span>
          <select
            value={country}
            onChange={(e) => { setCountry(e.target.value); setRegion("all"); }}
            className="input w-full"
            title="Filter by country"
          >
            <option value="all">Country: All</option>
            {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        {regionOptions.length > 0 && (
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Region</span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="input w-full"
              title="Filter by region"
            >
              <option value="all">Region: All</option>
              {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center justify-between mb-3 text-sm" style={{ color: "#6a7a9a" }}>
        <span>{filtered.length} {filtered.length === 1 ? "result" : "results"}</span>
        {isFiltered && (
          <button type="button" onClick={clearFilters} className="underline decoration-2 underline-offset-4 hover:text-brand-red transition-colors">
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="card text-center py-12" style={{ color: "#6a7a9a" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12" style={{ color: "#6a7a9a" }}>
          No matches. Try clearing filters or a different search.
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto border-2" style={{ borderColor: "rgba(26,39,68,0.2)" }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: "#f0ebe0", color: "#0e1833" }}>
                <tr>
                  <th className="text-left px-3 py-2 font-normal" style={{ fontFamily: "Georgia, serif" }}>Name</th>
                  <th className="text-left px-3 py-2 font-normal" style={{ fontFamily: "Georgia, serif" }}>Type</th>
                  <th className="text-left px-3 py-2 font-normal" style={{ fontFamily: "Georgia, serif" }}>City</th>
                  <th className="text-left px-3 py-2 font-normal" style={{ fontFamily: "Georgia, serif" }}>Region</th>
                  <th className="text-left px-3 py-2 font-normal" style={{ fontFamily: "Georgia, serif" }}>Country</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t" style={{ borderColor: "rgba(26,39,68,0.1)" }}>
                    <td className="px-3 py-2">
                      <Link
                        href={`/map`}
                        className="underline decoration-2 underline-offset-4 hover:text-brand-red transition-colors"
                        style={{ color: "inherit" }}
                      >
                        {e.display_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2" style={{ color: "#6a7a9a" }}>{TYPE_LABEL[e.entity_type]}</td>
                    <td className="px-3 py-2">{e.city}</td>
                    <td className="px-3 py-2" style={{ color: "#6a7a9a" }}>{e.region || "—"}</td>
                    <td className="px-3 py-2" style={{ color: "#6a7a9a" }}>{e.country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden grid gap-3">
            {filtered.map((e) => (
              <li key={e.id}>
                <div className="card block">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-lg font-black" style={{ color: "#0e1833", fontFamily: "Georgia, serif" }}>{e.display_name}</p>
                    <span className="eyebrow text-xs">{TYPE_LABEL[e.entity_type]}</span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: "#6a7a9a" }}>
                    {[e.city, e.region, e.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
