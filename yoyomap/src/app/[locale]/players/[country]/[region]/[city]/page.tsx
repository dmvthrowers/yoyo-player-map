import { Link, redirect } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { entriesInCity, listLocations, canonicalName, REGION_NORMALIZATION } from '@/lib/locations';
import { slugify } from '@/lib/locationSlug';
import { Counts, EntryCard, MapCta, NotListed } from '../../../EntryList';

export const revalidate = 3600;

interface Params { country: string; region: string; city: string }

export async function generateStaticParams() {
  const locations = await listLocations();
  const seen = new Set<string>();
  const out: Params[] = [];
  for (const loc of locations) {
    const c = slugify(loc.country);
    const r = loc.region ? slugify(loc.region) : '_other';
    const ci = slugify(loc.city);
    const key = `${c}|${r}|${ci}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ country: c, region: r, city: ci });
    }
  }
  return out;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { country, region, city } = await params;
  const entries = await entriesInCity(country, region, city);
  const countryName = canonicalName(entries, 'country') ?? country;
  const regionName = canonicalName(entries, 'region') ?? (region === '_other' ? '' : region);
  const cityName = canonicalName(entries, 'city') ?? city;
  const count = entries.length;
  const locationLabel = regionName ? `${cityName}, ${regionName}` : cityName;
  return {
    title: `Yo-Yo Players in ${locationLabel}`,
    description: `${count} yo-yo player${count === 1 ? '' : 's'}, shop${count === 1 ? '' : 's'}, and club${count === 1 ? '' : 's'} in ${locationLabel}, ${countryName}. Connect with the local community.`,
    alternates: { canonical: `/players/${country}/${region}/${city}` },
  };
}

export default async function CityPage({ params }: { params: Promise<Params> }) {
  const { country, region, city } = await params;
  const entries = await entriesInCity(country, region, city);
  if (entries.length === 0) {
    // If the region slug is a known abbreviation (e.g. "nc"), redirect to the
    // canonical slug (e.g. "north-carolina") so the correct page is served.
    const canonicalRegion = REGION_NORMALIZATION[region];
    if (canonicalRegion) {
      redirect(`/players/${country}/${slugify(canonicalRegion)}/${city}`);
    }
    return notFound();
  }

  const countryName = canonicalName(entries, 'country') ?? country;
  const regionName = canonicalName(entries, 'region') ?? (region === '_other' ? '' : region);
  const cityName = canonicalName(entries, 'city') ?? city;

  // Sort: shops/clubs first (they're permanent venues), people after
  const sorted = [...entries].sort((a, b) => {
    const order = { shop: 0, club: 1, person: 2 };
    return order[a.entity_type] - order[b.entity_type];
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <nav className="text-xs text-navy/60 mb-3">
        <Link href="/players" className="hover:text-brand-red">Players</Link> /{' '}
        <Link href={`/players/${country}`} className="hover:text-brand-red">{countryName}</Link> /{' '}
        <Link href={`/players/${country}/${region}`} className="hover:text-brand-red">{regionName || 'Unspecified region'}</Link> /{' '}
        {cityName}
      </nav>
      <p className="eyebrow text-brand-red">City</p>
      <h1 className="text-4xl md:text-5xl mt-2 text-navy-deep">
        Yo-Yo Players in {cityName}
      </h1>
      <p className="text-lg text-navy/70 mt-1">{[regionName, countryName].filter(Boolean).join(', ')}</p>
      <hr className="rule-red" />
      <Counts entries={entries} className="mb-8" />

      <div className="grid gap-4">
        {sorted.map((e) => <EntryCard key={e.id} e={e} />)}
      </div>

      <NotListed />
      <MapCta />
    </div>
  );
}
