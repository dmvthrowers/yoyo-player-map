import Link from 'next/link';
import type { PublicEntry } from '@/lib/locations';

const TYPE_LABEL: Record<PublicEntry['entity_type'], string> = {
  person: 'Thrower',
  shop: 'Shop',
  club: 'Club',
};

const SOCIAL_HOSTS: Array<{ key: string; label: string; prefix?: string }> = [
  { key: 'website', label: 'Website' },
  { key: 'instagram', label: 'Instagram', prefix: 'https://instagram.com/' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'discord', label: 'Discord' },
];

function socialHref(key: string, value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  const conf = SOCIAL_HOSTS.find((s) => s.key === key);
  if (conf?.prefix) return conf.prefix + value.replace(/^@/, '');
  return value;
}

export function EntryCard({ e }: { e: PublicEntry }) {
  return (
    <article className="card">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="font-display text-2xl text-navy-deep">{e.display_name}</h3>
        <span className="eyebrow text-brand-red">{TYPE_LABEL[e.entity_type]}</span>
      </header>
      <p className="text-sm text-text-body mt-1">
        {[e.city, e.region, e.country].filter(Boolean).join(', ')}
      </p>
      {e.bio && <p className="text-sm mt-3 leading-relaxed">{e.bio}</p>}
      {Object.keys(e.socials).length > 0 && (
        <ul className="flex flex-wrap gap-3 mt-3 text-xs">
          {SOCIAL_HOSTS.filter((s) => e.socials[s.key]).map((s) => (
            <li key={s.key}>
              <a
                href={socialHref(s.key, e.socials[s.key])}
                target="_blank"
                rel="noopener noreferrer ugc"
                className="underline decoration-2 underline-offset-4 hover:text-brand-red"
              >
                {s.label} ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function Counts({
  entries,
  className = '',
}: {
  entries: { entity_type: PublicEntry['entity_type'] }[];
  className?: string;
}) {
  const c = {
    person: entries.filter((e) => e.entity_type === 'person').length,
    shop: entries.filter((e) => e.entity_type === 'shop').length,
    club: entries.filter((e) => e.entity_type === 'club').length,
  };
  return (
    <p className={`text-sm text-navy/80 ${className}`}>
      <strong>{c.person}</strong> thrower{c.person === 1 ? '' : 's'}
      {c.shop > 0 && (
        <>
          , <strong>{c.shop}</strong> shop{c.shop === 1 ? '' : 's'}
        </>
      )}
      {c.club > 0 && (
        <>
          , <strong>{c.club}</strong> club{c.club === 1 ? '' : 's'}
        </>
      )}
    </p>
  );
}

export function MapCta() {
  return (
    <div className="mt-12 p-6 bg-cream-mid border-2 border-navy/20 text-center">
      <p className="font-display text-xl text-navy-deep mb-2">Want to see them on a map?</p>
      <Link href="/map" className="btn-primary">Open the YoYo Map</Link>
    </div>
  );
}

export function NotListed() {
  return (
    <p className="text-xs text-navy/60 mt-6 italic">
      Don&apos;t see yourself? Player pins are blurred ~10 miles for privacy. The list above is
      everyone who has chosen to be publicly visible.
    </p>
  );
}
