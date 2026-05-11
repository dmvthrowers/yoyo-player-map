import type { MetadataRoute } from 'next';
import { listLocations } from '@/lib/locations';
import { slugify } from '@/lib/locationSlug';
import { routing } from '@/i18n/routing';

const BASE = 'https://map.dmvthrowers.club';

// Runtime-rendered (not build-time) so env vars are guaranteed available, and
// transient Supabase errors at build don't ship a broken sitemap to prod.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const locales = routing.locales;

  // Static pages — one entry per locale since localePrefix is 'always'
  const staticPaths = [
    { path: '',        changeFrequency: 'weekly'  as const, priority: 1.0 },
    { path: '/map',    changeFrequency: 'daily'   as const, priority: 0.9 },
    { path: '/players',changeFrequency: 'daily'   as const, priority: 0.9 },
    { path: '/submit', changeFrequency: 'monthly' as const, priority: 0.7 },
    { path: '/legal/privacy', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/legal/terms',   changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.flatMap(({ path, changeFrequency, priority }) =>
    locales.map((locale) => ({
      url: `${BASE}/${locale}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    }))
  );

  // If Supabase is unreachable or env vars are missing, still return a valid
  // sitemap with the static routes — never let this throw and produce a 500.
  let locationEntries: MetadataRoute.Sitemap = [];
  try {
    const locations = await listLocations();
    const countries = new Set<string>();
    const regions = new Set<string>();
    const cities: { country: string; region: string; city: string }[] = [];

    for (const loc of locations) {
      const c = slugify(loc.country);
      if (!c) continue;
      countries.add(c);
      if (loc.region) {
        const r = slugify(loc.region);
        if (!r) continue;
        regions.add(`${c}/${r}`);
        const ci = slugify(loc.city);
        if (!ci) continue;
        cities.push({ country: c, region: r, city: ci });
      }
    }

    // Location pages are the same content in all locales; list English canonical only
    // to avoid duplicate-content penalties. Alternate locale links for these pages
    // are handled at the page level via Next.js metadata alternates configuration.
    locationEntries = [
      ...[...countries].map((c) => ({
        url: `${BASE}/en/players/${c}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...[...regions].map((r) => ({
        url: `${BASE}/en/players/${r}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
      ...cities.map((c) => ({
        url: `${BASE}/en/players/${c.country}/${c.region}/${c.city}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      })),
    ];
  } catch (e) {
    console.error('[sitemap] failed to load locations, returning static-only:', e);
  }

  return [...staticEntries, ...locationEntries];
}
