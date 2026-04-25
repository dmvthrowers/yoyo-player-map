import Link from 'next/link';
import type { Metadata } from 'next';
import { listLocations, canonicalCountryName } from '@/lib/locations';
import { slugify } from '@/lib/locationSlug';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Yo-Yo Players Worldwide — Browse by Location',
  description: 'Browse the YoYo Map by country, state, and city. Find local yo-yo players, shops, and clubs in your area.',
  alternates: { canonical: '/players' },
};

export default async function PlayersIndex() {
  const locations = await listLocations();
  const countries = new Map<string, { name: string; count: number }>();
  for (const loc of locations) {
    const canonicalName = canonicalCountryName(loc.country);
    const slug = slugify(canonicalName);
    const cur = countries.get(slug);
    if (cur) cur.count += 1;
    else countries.set(slug, { name: canonicalName, count: 1 });
  }
  const sorted = [...countries.entries()].sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <p className="eyebrow text-brand-red">Browse Locations</p>
      <h1 className="text-4xl md:text-5xl mt-2 text-navy-deep">Yo-Yo Players Worldwide</h1>
      <hr className="rule-red" />
      <p className="text-text-body mb-8 leading-relaxed">
        Find yo-yo players, shops, and clubs near you. Locations on YoYo Map are opt-in
        and city-level only — exact addresses are never published.
      </p>

      {sorted.length === 0 ? (
        <p className="text-navy/70">No locations yet — be the first to <Link href="/submit" className="underline">add yourself</Link>.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {sorted.map(([slug, { name, count }]) => (
            <li key={slug}>
              <Link href={`/players/${slug}`} className="card block hover:border-brand-red transition-colors">
                <p className="font-display text-2xl text-navy-deep">{name}</p>
                <p className="text-sm text-navy/70">
                  {count} location{count === 1 ? '' : 's'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
