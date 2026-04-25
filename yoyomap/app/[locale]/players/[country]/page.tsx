import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { entriesInCountry, listLocations, canonicalName, canonicalCountryName } from '@/lib/locations';
import { slugify } from '@/lib/locationSlug';
import { Counts, MapCta, NotListed } from '../EntryList';

export const revalidate = 3600;

interface Params { country: string }

export async function generateStaticParams() {
  const locations = await listLocations();
  const seen = new Set<string>();
  const out: Params[] = [];
  for (const loc of locations) {
    const canonical = canonicalCountryName(loc.country);
    const c = slugify(canonical);
    if (!seen.has(c)) {
      seen.add(c);
      out.push({ country: c });
    }
  }
  return out;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { country } = await params;
  const entries = await entriesInCountry(country);
  const name = canonicalName(entries, 'country') ?? country;
  return {
    title: `Yo-Yo Players in ${name}`,
    description: `Browse yo-yo players, shops, and clubs in ${name}. Privacy-first, opt-in community map.`,
    alternates: { canonical: `/players/${country}` },
  };
}

export default async function CountryPage({ params }: { params: Promise<Params> }) {
  const { country } = await params;
  // Find all entries that match the canonical slug
  const allEntries = await entriesInCountry(country);
  if (allEntries.length === 0) notFound();
  const name = canonicalName(allEntries, 'country') ?? country;

  // Group by region
  const regions = new Map<string, { name: string; count: number }>();
  for (const e of allEntries) {
    const regionLabel = e.region ?? 'Unspecified';
    const slug = e.region ? slugify(e.region) : '_other';
    const cur = regions.get(slug);
    if (cur) cur.count += 1;
    else regions.set(slug, { name: regionLabel, count: 1 });
  }
  const sorted = [...regions.entries()].sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <nav className="text-xs text-navy/60 mb-3">
        <Link href="/players" className="hover:text-brand-red">Players</Link> / {name}
      </nav>
      <p className="eyebrow text-brand-red">Country</p>
      <h1 className="text-4xl md:text-5xl mt-2 text-navy-deep">Yo-Yo Players in {name}</h1>
      <hr className="rule-red" />
      <Counts entries={allEntries} className="mb-8" />

      <h2 className="font-display text-2xl text-navy-deep mb-4">Regions</h2>
      <ul className="grid sm:grid-cols-2 gap-4">
        {sorted.map(([slug, r]) => (
          <li key={slug}>
            {slug === '_other' ? (
              <div className="card opacity-70">
                <p className="font-display text-xl text-navy-deep">{r.name}</p>
                <p className="text-sm text-navy/70">{r.count} location{r.count === 1 ? '' : 's'}</p>
              </div>
            ) : (
              <Link href={`/players/${country}/${slug}`} className="card block hover:border-brand-red transition-colors">
                <p className="font-display text-xl text-navy-deep">{r.name}</p>
                <p className="text-sm text-navy/70">{r.count} location{r.count === 1 ? '' : 's'}</p>
              </Link>
            )}
          </li>
        ))}
      </ul>

      <NotListed />
      <MapCta />
    </div>
  );
}
