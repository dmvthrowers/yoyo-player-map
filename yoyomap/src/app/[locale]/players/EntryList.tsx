import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import type { PublicEntry } from '@/lib/locations';

const TYPE_LABEL_KEY: Record<PublicEntry['entity_type'], 'typeThrower' | 'typeShopSingular' | 'typeClubSingular'> = {
  person: 'typeThrower',
  shop: 'typeShopSingular',
  club: 'typeClubSingular',
};

const SOCIAL_HOSTS: Array<{ key: string; labelKey: 'socialWebsite' | 'socialInstagram' | 'socialYouTube' | 'socialDiscord'; prefix?: string }> = [
  { key: 'website', labelKey: 'socialWebsite' },
  { key: 'instagram', labelKey: 'socialInstagram', prefix: 'https://instagram.com/' },
  { key: 'youtube', labelKey: 'socialYouTube' },
  { key: 'discord', labelKey: 'socialDiscord' },
];

function socialHref(key: string, value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  const conf = SOCIAL_HOSTS.find((s) => s.key === key);
  if (conf?.prefix) return conf.prefix + value.replace(/^@/, '');
  return value;
}

export async function EntryCard({ e }: { e: PublicEntry }) {
  const t = await getTranslations('players');
  return (
    <article className="card">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="font-display text-2xl text-navy-deep">{e.display_name}</h3>
        <span className="eyebrow text-brand-red">{t(TYPE_LABEL_KEY[e.entity_type])}</span>
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
                {t(s.labelKey)} ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export async function Counts({
  entries,
  className = '',
}: {
  entries: { entity_type: PublicEntry['entity_type'] }[];
  className?: string;
}) {
  const t = await getTranslations('players');
  const c = {
    person: entries.filter((e) => e.entity_type === 'person').length,
    shop: entries.filter((e) => e.entity_type === 'shop').length,
    club: entries.filter((e) => e.entity_type === 'club').length,
  };
  const parts = [
    t('throwerCount', { count: c.person }),
    c.shop > 0 ? t('shopCount', { count: c.shop }) : null,
    c.club > 0 ? t('clubCount', { count: c.club }) : null,
  ].filter(Boolean);
  return (
    <p className={`text-sm text-navy/80 ${className}`}>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && ', '}
          {part}
        </span>
      ))}
    </p>
  );
}

export async function MapCta() {
  const t = await getTranslations('players');
  return (
    <div className="mt-12 p-6 bg-cream-mid border-2 border-navy/20 text-center">
      <p className="font-display text-xl text-navy-deep mb-2">{t('mapCtaHeading')}</p>
      <Link href="/map" className="btn-primary">{t('mapCtaButton')}</Link>
    </div>
  );
}

export async function NotListed() {
  const t = await getTranslations('players');
  return (
    <p className="text-xs text-navy/60 mt-6 italic">
      {t('notListedText')}
    </p>
  );
}
