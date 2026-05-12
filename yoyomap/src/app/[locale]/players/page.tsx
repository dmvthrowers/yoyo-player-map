
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';
import { fetchAllPublicEntries, canonicalCountryName } from '@/lib/locations';
import { slugify } from '@/lib/locationSlug';
import { getTranslations } from 'next-intl/server';
import PlayersTable from './PlayersTable';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Yo-Yo Players Worldwide — Browse by Location',
  description: 'Browse the YoYo Map by country, state, and city. Find local yo-yo players, shops, and clubs in your area.',
  alternates: { canonical: '/players' },
};

export default async function Page() {
  const t = await getTranslations();
  const entries = await fetchAllPublicEntries();
  // Distinct (country|region|city) per country, to match the "# locations" label.
  const countries = new Map<string, { name: string; cities: Set<string> }>();
  for (const e of entries) {
    const canonicalName = canonicalCountryName(e.country);
    const slug = slugify(canonicalName);
    const cityKey = `${e.region ?? ''}|${e.city}`;
    const cur = countries.get(slug);
    if (cur) cur.cities.add(cityKey);
    else countries.set(slug, { name: canonicalName, cities: new Set([cityKey]) });
  }
  const sorted = [...countries.entries()].sort((a, b) =>
    a[1].name.localeCompare(b[1].name, undefined, { sensitivity: 'base' })
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <p className="eyebrow text-brand-red">{t('players.browseLocations')}</p>
      <h1 className="text-4xl md:text-5xl mt-2 text-navy-deep">{t('players.title')}</h1>
      <hr className="rule-red" />
      <p className="text-text-body mb-8 leading-relaxed">
        {t('players.description')}
      </p>

      {sorted.length === 0 ? (
        <p className="text-navy/70">
          {t.rich('players.noLocations', { 
            addYourself: (chunks) => <Link href="/submit" className="underline">{chunks}</Link> 
          })}
        </p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {sorted.map(([slug, { name, cities }]) => (
            <li key={slug}>
              <Link href={`/players/${slug}`} className="card block hover:border-brand-red transition-colors">
                <p className="font-display text-2xl text-navy-deep">{name}</p>
                <p className="text-sm text-navy/70">
                  {t('players.locationCount', { count: cities.size })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <PlayersTable entries={entries} />
    </div>
  );
}
