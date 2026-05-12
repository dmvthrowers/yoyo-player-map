const path = require('path');
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://unpkg.com",
  "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'geolocation=(), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '..'),
  // ESLint is run separately in CI (eslint .) so skip it during `next build`
  // to avoid the deprecated `next lint` path and @rushstack/eslint-patch
  // incompatibility with ESLint 9.x.
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      // Browsers and bots always request these; serve the SVG favicon we have.
      { source: '/favicon.ico', destination: '/favicon.svg', permanent: false },
      { source: '/favicon.png', destination: '/favicon.svg', permanent: false },
      // Default-locale fallbacks for shared direct links.
      { source: '/map', destination: '/en/map', permanent: false },
      { source: '/players', destination: '/en/players', permanent: false },
      { source: '/submit', destination: '/en/submit', permanent: false },
      { source: '/profile', destination: '/en/profile', permanent: false },
      { source: '/report', destination: '/en/report', permanent: false },
      { source: '/status', destination: '/en/status', permanent: false },
      { source: '/contact', destination: '/en/contact', permanent: false },
      { source: '/legal/privacy', destination: '/en/legal/privacy', permanent: false },
      { source: '/legal/terms', destination: '/en/legal/terms', permanent: false },
      { source: '/legal/security', destination: '/en/legal/security', permanent: false },
      { source: '/confirm-location/:token', destination: '/en/confirm-location/:token', permanent: false },
      // Legacy path that appears in old links/bookmarks.
      { source: '/yoyomap', destination: '/en/map', permanent: true },
      {
        source: '/:locale(en|es|de|zh|ja|fr|pt|ru|ar|hi|ko)/yoyomap',
        destination: '/:locale/map',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // Long-lived cache for immutable static assets
      {
        source: '/favicon.svg',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/googlebd23ccd58abb7f86.html',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // OG image: long cache but not immutable (may be updated)
      {
        source: '/opengraph.jpg',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/favicon.ico', destination: '/favicon.svg' },
      { source: '/favicon.png', destination: '/favicon.svg' },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
