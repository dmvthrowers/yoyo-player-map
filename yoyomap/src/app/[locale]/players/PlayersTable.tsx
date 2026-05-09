'use client';

import { useMemo, useState, useDeferredValue } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import type { PublicEntry } from '@/lib/locations';
import { canonicalCountryName, canonicalRegionName, isJunkRegion } from '@/lib/locations';
import { locationPath } from '@/lib/locationSlug';

const TYPE_LABEL_KEY: Record<PublicEntry['entity_type'], 'typePerson' | 'typeShop' | 'typeClub'> = {
  person: 'typePerson',
  shop: 'typeShop',
  club: 'typeClub',
};

type EntityFilter = 'all' | PublicEntry['entity_type'];

interface Props {
  entries: PublicEntry[];
  hideLocationFilters?: boolean;
}

const COMBINING_MARKS = /[̀-ͯ]/g;
function fold(s: string | null | undefined): string {
  if (!s) return '';
  return s.normalize('NFKD').replace(COMBINING_MARKS, '').toLowerCase();
}

function matchesSearch(entry: PublicEntry, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const fields = [
    fold(entry.display_name),
    fold(entry.city),
    fold(entry.region),
    fold(canonicalCountryName(entry.country)),
    fold(canonicalRegionName(entry.region)),
  ];
  return words.every((w) => fields.some((f) => f.includes(w)));
}

export default function PlayersTable({ entries, hideLocationFilters = false }: Props) {
  const t = useTranslations('players');

  const [query, setQuery] = useState('');
  const [type, setType] = useState<EntityFilter>('all');
  const [country, setCountry] = useState<string>('all');
  const [region, setRegion] = useState<string>('all');

  const deferredQuery = useDeferredValue(query);

  // Build filter dropdown options from canonical names so duplicates collapse.
  const countryOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const e of entries) {
      const name = canonicalCountryName(e.country);
      if (name) set.set(name, name);
    }
    return [...set.values()].sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const regionOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const e of entries) {
      if (country !== 'all' && canonicalCountryName(e.country) !== country) continue;
      if (isJunkRegion(e.region)) continue;
      const name = canonicalRegionName(e.region);
      if (name) set.set(name, name);
    }
    return [...set.values()].sort((a, b) => a.localeCompare(b));
  }, [entries, country]);

  const filtered = useMemo(() => {
    return entries
      .filter((e) => (type === 'all' ? true : e.entity_type === type))
      .filter((e) => (country === 'all' ? true : canonicalCountryName(e.country) === country))
      .filter((e) => (region === 'all' ? true : canonicalRegionName(e.region) === region))
      .filter((e) => matchesSearch(e, deferredQuery))
      .sort((a, b) =>
        a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' })
      );
  }, [entries, type, country, region, deferredQuery]);

  const filteredDisplay = useMemo(() => {
    return filtered.map((e) => {
      const countryName = canonicalCountryName(e.country);
      const junk = isJunkRegion(e.region);
      const regionName = junk ? '' : canonicalRegionName(e.region);
      const href = locationPath(countryName, junk ? '_other' : (e.region || '_other'), e.city);
      return { ...e, countryName, regionName, href };
    });
  }, [filtered]);

  const isFiltered =
    query !== '' || type !== 'all' || country !== 'all' || region !== 'all';

  function clearFilters() {
    setQuery('');
    setType('all');
    setCountry('all');
    setRegion('all');
  }

  // If country changes, reset region to avoid stale "Texas while Country=Japan" state.
  function onCountryChange(next: string) {
    setCountry(next);
    setRegion('all');
  }

  return (
    <section className="mt-12">
      <h2 className="font-display text-3xl text-navy-deep mb-2">{t('directoryHeading')}</h2>
      <p className="text-text-body mb-6 leading-relaxed">{t('directoryDescription')}</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <label className={`block ${hideLocationFilters ? 'sm:col-span-2 lg:col-span-3' : 'sm:col-span-2 lg:col-span-2'}`}>
          <span className="sr-only">{t('searchPlaceholder')}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full px-3 py-2 border-2 border-navy/30 bg-cream-light focus:border-brand-red focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="sr-only">{t('filterType')}</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EntityFilter)}
            className="w-full px-3 py-2 border-2 border-navy/30 bg-cream-light focus:border-brand-red focus:outline-none"
          >
            <option value="all">{t('filterType')}: {t('filterAll')}</option>
            <option value="person">{t('typePerson')}</option>
            <option value="shop">{t('typeShop')}</option>
            <option value="club">{t('typeClub')}</option>
          </select>
        </label>

        {!hideLocationFilters && (
          <label className="block">
            <span className="sr-only">{t('filterCountry')}</span>
            <select
              value={country}
              onChange={(e) => onCountryChange(e.target.value)}
              className="w-full px-3 py-2 border-2 border-navy/30 bg-cream-light focus:border-brand-red focus:outline-none"
            >
              <option value="all">{t('filterCountry')}: {t('filterAll')}</option>
              {countryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}

        {!hideLocationFilters && regionOptions.length > 0 && (
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="sr-only">{t('filterRegion')}</span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 border-2 border-navy/30 bg-cream-light focus:border-brand-red focus:outline-none"
            >
              <option value="all">{t('filterRegion')}: {t('filterAll')}</option>
              {regionOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center justify-between mb-3 text-sm text-navy/70">
        <span>{t('resultCount', { count: filtered.length })}</span>
        {isFiltered && (
          <button
            type="button"
            onClick={clearFilters}
            className="underline decoration-2 underline-offset-4 hover:text-brand-red"
          >
            {t('clearFilters')}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="card text-center text-navy/70">{t('noResults')}</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto border-2 border-navy/20">
            <table className="w-full text-sm">
              <thead className="bg-cream-mid text-navy-deep">
                <tr>
                  <th className="text-left px-3 py-2 font-display font-normal">{t('thName')}</th>
                  <th className="text-left px-3 py-2 font-display font-normal">{t('thType')}</th>
                  <th className="text-left px-3 py-2 font-display font-normal">{t('thCity')}</th>
                  <th className="text-left px-3 py-2 font-display font-normal">{t('thRegion')}</th>
                  <th className="text-left px-3 py-2 font-display font-normal">{t('thCountry')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDisplay.map((e) => {
                  return (
                    <tr key={e.id} className="border-t border-navy/10 hover:bg-cream-mid/50">
                      <td className="px-3 py-2">
                        <Link href={e.href} className="underline decoration-2 underline-offset-4 hover:text-brand-red">
                          {e.display_name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-navy/70">{t(TYPE_LABEL_KEY[e.entity_type])}</td>
                      <td className="px-3 py-2">{e.city}</td>
                      <td className="px-3 py-2 text-navy/70">{e.regionName || '—'}</td>
                      <td className="px-3 py-2 text-navy/70">{e.countryName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden grid gap-3">
            {filteredDisplay.map((e) => {
              return (
                <li key={e.id}>
                  <Link href={e.href} className="card block hover:border-brand-red transition-colors">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-display text-lg text-navy-deep">{e.display_name}</p>
                      <span className="eyebrow text-brand-red text-xs">{t(TYPE_LABEL_KEY[e.entity_type])}</span>
                    </div>
                    <p className="text-sm text-navy/70 mt-1">
                      {[e.city, e.regionName, e.countryName].filter(Boolean).join(', ')}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
