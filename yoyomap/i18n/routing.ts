import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'es', 'de', 'zh', 'ja', 'fr', 'pt', 'ru', 'ar', 'hi', 'ko'],
  defaultLocale: 'en',
  localePrefix: 'always', // ← ADD THIS
});