import type { MetadataRoute } from 'next';
import { listLocations } from '@/lib/locations';
import { slugify } from '@/lib/locationSlug';
import { routing } from '@/i18n/routing';

const BASE = 'https://map.dmvthrowers.club';

// Runtime-rendered (not build-time) so env vars are guaranteed available, and
// transient Supabase errors at build don't ship a broken sitemap to prod.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fixed date: a build-time `new Date()` made every page look changed on every render.
  // Update when public content changes.
  const lastModified = new Date('2026-10-06');
  const now = lastModified;
  const locales = routing.locales;
  // hreflang alternates for a path under every locale (plus x-default).
  const alternatesFor = (suffix: string) => ({
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `${BASE}/${l}${suffix}`])),
      'x-default': `${BASE}/${routing.defaultLocale}${suffix}`,
    },
  });

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

    // Location pages are the same content in all locales; list the English URL with hreflang
    // alternates for every locale (the pages declare the same alternates in their metadata).
    locationEntries = [
      ...[...countries].map((c) => ({
        url: `${BASE}/en/players/${c}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        alternates: alternatesFor(`/players/${c}`),
      })),
      ...[...regions].map((r) => ({
        url: `${BASE}/en/players/${r}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
        alternates: alternatesFor(`/players/${r}`),
      })),
      ...cities.map((c) => ({
        url: `${BASE}/en/players/${c.country}/${c.region}/${c.city}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
        alternates: alternatesFor(`/players/${c.country}/${c.region}/${c.city}`),
      })),
    ];
  } catch (e) {
    console.error('[sitemap] failed to load locations, returning static-only:', e);
  }

  return [...staticEntries, ...locationEntries];
}
