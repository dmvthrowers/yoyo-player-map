import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin', '/profile', '/report'],
      },
    ],
    sitemap: 'https://map.dmvthrowers.club/sitemap.xml',
    host: 'https://map.dmvthrowers.club',
  };
}
