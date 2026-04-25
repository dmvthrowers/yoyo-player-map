import type { MetadataRoute } from 'next';

const BASE = 'https://map.dmvthrowers.club';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`,              lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/map`,           lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/submit`,        lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/legal/privacy`, lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/legal/terms`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ];
}
