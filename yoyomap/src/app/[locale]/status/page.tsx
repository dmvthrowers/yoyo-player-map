import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

type StatusLevel = 'operational' | 'degraded' | 'outage' | 'monitor';

// label: vendor-provided description string (always English, from their API),
//        or null when we supply our own fallback key.
// unavailable: true when the status feed could not be fetched (our fallback).
type LiveStatus = {
  level: StatusLevel;
  label: string | null;
  unavailable?: boolean;
  updatedAt?: string | null;
};

type ServiceCard = {
  name: string;
  category: 'Core app' | 'Delivery' | 'Infrastructure' | 'Mapping' | 'Signals';
  description: string;
  impact: string;
  linkLabel: string;
  statusUrl: string;
  liveStatusUrl?: string;
  notes?: string;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'status' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: '/status' },
  };
}

export const revalidate = 300;

const SERVICES: ServiceCard[] = [
  {
    name: 'Vercel',
    category: 'Core app',
    description: 'Hosts the Next.js site, API routes, cron jobs, and runtime infrastructure.',
    impact: 'If Vercel is down, the site, submit flow, admin routes, and scheduled jobs can all fail or become unavailable.',
    linkLabel: 'Vercel status',
    statusUrl: 'https://www.vercel-status.com/',
    liveStatusUrl: 'https://www.vercel-status.com/api/v2/status.json',
  },
  {
    name: 'Supabase',
    category: 'Core app',
    description: 'Backs the database, auth-adjacent token storage, location data, reports, reminders, and audit logs.',
    impact: 'If Supabase is degraded, map data, submissions, profile management, moderation, and location lookups may fail or return stale data.',
    linkLabel: 'Supabase status',
    statusUrl: 'https://status.supabase.com/',
    liveStatusUrl: 'https://status.supabase.com/api/v2/status.json',
  },
  {
    name: 'Resend',
    category: 'Delivery',
    description: 'Delivers verification emails, consent links, magic links, reminders, and admin notices.',
    impact: 'If Resend is down, entries can still be saved in some flows, but verification, consent, and recovery emails may be delayed or blocked.',
    linkLabel: 'Resend status',
    statusUrl: 'https://resend-status.com/',
    notes: 'Official status page only. We are not fetching a machine-readable status feed for this service.',
  },
  {
    name: 'Porkbun',
    category: 'Infrastructure',
    description: 'Handles domain registration and parts of the site DNS management chain.',
    impact: 'If Porkbun has DNS or domain control issues, the site or email-related endpoints may become hard to resolve or manage.',
    linkLabel: 'Porkbun status',
    statusUrl: 'https://status.porkbun.com/',
    notes: 'Best treated as a linked status source here. Their public status surface is not wired into this page as a live API feed.',
  },
  {
    name: 'Cloudflare',
    category: 'Infrastructure',
    description: 'Porkbun notes Cloudflare-backed DNS infrastructure in their status reporting.',
    impact: 'If Cloudflare DNS is degraded, domain resolution can break even when the app itself is healthy.',
    linkLabel: 'Cloudflare status',
    statusUrl: 'https://www.cloudflarestatus.com/',
    liveStatusUrl: 'https://www.cloudflarestatus.com/api/v2/status.json',
  },
  {
    name: 'GitHub',
    category: 'Infrastructure',
    description: 'Hosts the source repository and CI/CD visibility around the project.',
    impact: 'If GitHub is down, the live site may continue to serve, but repo access, workflow runs, and some deployment visibility can be interrupted.',
    linkLabel: 'GitHub status',
    statusUrl: 'https://www.githubstatus.com/',
    liveStatusUrl: 'https://www.githubstatus.com/api/v2/status.json',
  },
  {
    name: 'OpenStreetMap Nominatim',
    category: 'Mapping',
    description: 'Used server-side for geocoding city and address inputs during submissions and admin re-geocoding.',
    impact: 'If Nominatim is unavailable, new submissions, shop address validation, and bulk re-geocoding can fail even if the public map still loads.',
    linkLabel: 'Nominatim status docs',
    statusUrl: 'https://nominatim.org/release-docs/latest/api/Status/',
    notes: 'This page links to the official Nominatim status documentation rather than polling it directly.',
  },
  {
    name: 'OpenStreetMap platform',
    category: 'Mapping',
    description: 'Upstream map and search ecosystem used by parts of the map and geocoding workflow.',
    impact: 'Broader OpenStreetMap issues can affect map-related features, especially geocoding and upstream data availability.',
    linkLabel: 'OpenStreetMap platform status',
    statusUrl: 'https://wiki.openstreetmap.org/Platform_Status',
  },
  {
    name: 'CARTO basemaps',
    category: 'Mapping',
    description: 'Provides the tile basemap layer rendered under the YoYo Map markers.',
    impact: 'If CARTO tiles fail, the map background can appear blank or incomplete while entry data and API routes still work.',
    linkLabel: 'CARTO status',
    statusUrl: 'https://status.carto.com/',
  },
  {
    name: 'Downdetector',
    category: 'Signals',
    description: 'Community-reported outage chatter across consumer and infrastructure services.',
    impact: 'This does not directly power YoYo Map, but it can help confirm wider regional or ISP issues when official pages are quiet.',
    linkLabel: 'Downdetector',
    statusUrl: 'https://downdetector.com/',
    notes: 'Community signal only, not an official vendor status source.',
  },
];

function mapIndicator(indicator: string | null | undefined): StatusLevel {
  switch (indicator) {
    case 'none':
    case 'operational':
      return 'operational';
    case 'minor':
    case 'degraded_performance':
      return 'degraded';
    case 'major':
    case 'partial_outage':
    case 'maintenance':
      return 'monitor';
    case 'critical':
    case 'major_outage':
      return 'outage';
    default:
      return 'monitor';
  }
}

async function fetchLiveStatus(service: ServiceCard): Promise<LiveStatus | null> {
  if (!service.liveStatusUrl) return null;

  try {
    const res = await fetch(service.liveStatusUrl, {
      next: { revalidate },
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return {
        level: 'monitor',
        label: null,
        unavailable: true,
        updatedAt: null,
      };
    }

    const data = await res.json();
    const indicator = data?.status?.indicator as string | undefined;
    const description = data?.status?.description as string | undefined;
    const updatedAt = data?.page?.updated_at as string | undefined;

    return {
      level: mapIndicator(indicator),
      label: description || null,
      updatedAt: updatedAt || null,
    };
  } catch {
    return {
      level: 'monitor',
      label: null,
      unavailable: true,
      updatedAt: null,
    };
  }
}

function badgeClasses(level: StatusLevel) {
  switch (level) {
    case 'operational':
      return {
        dot: 'bg-emerald-500',
        pill: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      };
    case 'degraded':
      return {
        dot: 'bg-amber-500',
        pill: 'border-amber-200 bg-amber-50 text-amber-900',
      };
    case 'outage':
      return {
        dot: 'bg-red-500',
        pill: 'border-red-200 bg-red-50 text-red-900',
      };
    case 'monitor':
    default:
      return {
        dot: 'bg-slate-500',
        pill: 'border-slate-200 bg-slate-50 text-slate-900',
      };
  }
}

function formatUpdatedAt(input: string | null | undefined, locale: string) {
  if (!input) return null;

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}

export default async function StatusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('status');
  const statuses = await Promise.all(SERVICES.map((service) => fetchLiveStatus(service)));

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-red">{t('eyebrow')}</p>
        <h1 className="mt-3 text-4xl font-display text-navy-deep">{t('heading')}</h1>
        <p className="mt-4 text-base text-navy/75">{t('intro')}</p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {SERVICES.map((service, index) => {
          const live = statuses[index];
          const badge = badgeClasses(live?.level ?? 'monitor');
          const updatedAt = formatUpdatedAt(live?.updatedAt, locale);
          const statusLabel = live == null
            ? t('linkedStatusPage')
            : live.unavailable
              ? t('feedUnavailable')
              : (live.label ?? t('statusAvailable'));

          return (
            <section
              key={service.name}
              className="border border-navy/10 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-navy/45">
                    {service.category}
                  </p>
                  <h2 className="mt-1 text-2xl font-display text-navy-deep">{service.name}</h2>
                </div>
                <div
                  className={`inline-flex items-center gap-2 border px-3 py-1 text-xs font-semibold ${badge.pill}`}
                >
                  <span className={`h-2.5 w-2.5 ${badge.dot}`} aria-hidden="true" />
                  <span>{statusLabel}</span>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-navy/75">{service.description}</p>

              <div className="mt-4 border-l-4 border-brand-red/70 bg-brand-red/5 px-4 py-3 text-sm text-navy/85">
                <strong className="text-navy-deep">{t('whatInterrupted')}</strong> {service.impact}
              </div>

              {service.notes ? (
                <p className="mt-4 text-xs leading-5 text-navy/55">{service.notes}</p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-navy/10 pt-4">
                <a
                  href={service.statusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-brand-red underline underline-offset-4 hover:no-underline"
                >
                  {service.linkLabel}
                </a>
                {updatedAt ? (
                  <p className="text-xs text-navy/45">{t('lastVendorUpdate', { updatedAt })}</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10 border border-navy/10 bg-cream px-5 py-4 text-sm text-navy/75">
        <p>{t('disclaimer')}</p>
      </div>
    </div>
  );
}
