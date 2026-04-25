import type { MetadataRoute } from 'next';
import { listLocations } from '@/lib/locations';
import { slugify } from '@/lib/locationSlug';

const BASE = 'https://map.dmvthrowers.club';

export const revalidate = 3600; // refresh sitemap hourly so new cities appear in Search Console

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,              lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/map`,           lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/players`,       lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/submit`,        lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/legal/privacy`, lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/legal/terms`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ];

  const locations = await listLocations();
  const countries = new Set<string>();
  const regions = new Set<string>();
  const cities: { country: string; region: string; city: string }[] = [];

  for (const loc of locations) {
    const c = slugify(loc.country);
    countries.add(c);
    if (loc.region) {
      const r = slugify(loc.region);
      regions.add(`${c}/${r}`);
      cities.push({ country: c, region: r, city: slugify(loc.city) });
    }
  }

  const locationEntries: MetadataRoute.Sitemap = [
    ...[...countries].map((c) => ({
      url: `${BASE}/players/${c}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...[...regions].map((r) => ({
      url: `${BASE}/players/${r}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...cities.map((c) => ({
      url: `${BASE}/players/${c.country}/${c.region}/${c.city}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ];

  return [...staticEntries, ...locationEntries];
}
