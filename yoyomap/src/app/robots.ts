import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin', '/profile', '/report', '/confirm-location',
          // Every page lives under a locale prefix (/en/admin), so match those too.
          '/*/admin', '/*/profile', '/*/report', '/*/confirm-location',
        ],
      },
    ],
    sitemap: 'https://map.dmvthrowers.club/sitemap.xml',
  };
}
