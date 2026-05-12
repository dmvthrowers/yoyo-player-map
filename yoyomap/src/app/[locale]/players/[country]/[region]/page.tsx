import { Link, redirect } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { entriesInRegion, listLocations, canonicalName, REGION_NORMALIZATION, isJunkRegion } from '@/lib/locations';
import { slugify } from '@/lib/locationSlug';
import { Counts, MapCta, NotListed } from '../../EntryList';
import { getTranslations } from 'next-intl/server';
import PlayersTable from '../../PlayersTable';

export const revalidate = 86400;

interface Params { locale: string; country: string; region: string }

export async function generateStaticParams() {
  const locations = await listLocations();
  const seen = new Set<string>();
  const out: Omit<Params, 'locale'>[] = [];
  for (const loc of locations) {
    const countrySlug = slugify(loc.country);
    if (loc.region) {
      if (isJunkRegion(loc.region)) continue;
      const regionSlug = slugify(loc.region);
      const key = `${countrySlug}|${regionSlug}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ country: countrySlug, region: regionSlug });
      }
    } else {
      // Add static param for unspecified region
      const key = `${countrySlug}|_other`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ country: countrySlug, region: '_other' });
      }
    }
  }
  return out;
}


export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { country, region } = await params;
  const entries = await entriesInRegion(country, region);
  const countryName = canonicalName(entries, 'country') ?? country;
  const regionName = canonicalName(entries, 'region') ?? region;
  return {
    title: `Yo-Yo Players in ${regionName}, ${countryName}`,
    description: `Find yo-yo players, shops, and clubs in ${regionName}, ${countryName}. Browse the local community on YoYo Map.`,
    alternates: { canonical: `/players/${country}/${region}` },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const t = await getTranslations();
  const { locale, country, region } = await params;
  if (region !== '_other' && isJunkRegion(region)) return notFound();
  let entries;
  if (region === '_other') {
    // Show all entries for this country with no region
    const all = await entriesInRegion(country, '');
    entries = all.filter((e) => !e.region || e.region.trim() === '');
    if (entries.length === 0) return notFound();
    const countryName = entries[0]?.country ?? country;
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <nav className="text-xs text-navy/60 mb-3">
          <Link href="/players" className="hover:text-brand-red">{t('nav.players')}</Link> /{' '}
          <Link href={`/players/${country}`} className="hover:text-brand-red">{countryName}</Link> / {t('players.unspecified')}
        </nav>
        <p className="eyebrow text-brand-red">{t('players.region')}</p>
        <h1 className="text-4xl md:text-5xl mt-2 text-navy-deep">
          {t('players.inCountryUnspecifiedRegion', { country: countryName })}
        </h1>
        <hr className="rule-red" />
        <Counts entries={entries} className="mb-8" />
        <PlayersTable entries={entries} hideLocationFilters />
        <NotListed />
        <MapCta />
      </div>
    );
  } else {
    entries = await entriesInRegion(country, region);
    if (entries.length === 0) {
      // If the region slug is a known abbreviation (e.g. "nc"), redirect to the
      // canonical slug (e.g. "north-carolina") so the correct page is served.
      const canonicalRegion = REGION_NORMALIZATION[region];
      if (canonicalRegion) {
        redirect({ href: `/players/${country}/${slugify(canonicalRegion)}`, locale });
      }
      return notFound();
    }
    const countryName = canonicalName(entries, 'country') ?? country;
    const regionName = canonicalName(entries, 'region') ?? region;

    const cities = new Map<string, { name: string; count: number }>();
    for (const e of entries) {
      const slug = slugify(e.city);
      const cur = cities.get(slug);
      if (cur) cur.count += 1;
      else cities.set(slug, { name: e.city, count: 1 });
    }
    const sorted = [...cities.entries()].sort((a, b) =>
      a[1].name.localeCompare(b[1].name, undefined, { sensitivity: 'base' })
    );

    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <nav className="text-xs text-navy/60 mb-3">
          <Link href="/players" className="hover:text-brand-red">{t('nav.players')}</Link> /{' '}
          <Link href={`/players/${country}`} className="hover:text-brand-red">{countryName}</Link> /{' '}
          {regionName}
        </nav>
        <p className="eyebrow text-brand-red">{t('players.region')}</p>
        <h1 className="text-4xl md:text-5xl mt-2 text-navy-deep">
          {t('players.inRegion', { region: regionName })}
        </h1>
        <hr className="rule-red" />
        <Counts entries={entries} className="mb-8" />

        <h2 className="font-display text-2xl text-navy-deep mb-4">{t('players.cities')}</h2>
        <ul className="grid sm:grid-cols-2 gap-4">
          {sorted.map(([slug, c]) => (
            <li key={slug}>
              <Link
                href={`/players/${country}/${region}/${slug}`}
                className="card block hover:border-brand-red transition-colors"
              >
                <p className="font-display text-xl text-navy-deep">{c.name}</p>
                <p className="text-sm text-navy/70">{t('players.locationCount', { count: c.count })}</p>
              </Link>
            </li>
          ))}
        </ul>

        <PlayersTable entries={entries} hideLocationFilters />
        <NotListed />
        <MapCta />
      </div>
    );
  }
}
