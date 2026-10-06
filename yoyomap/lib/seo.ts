import { routing } from '@/i18n/routing';

/**
 * Canonical and hreflang alternates for a page in a given locale.
 *
 * Every URL has a locale prefix (localePrefix is 'always'), so the canonical must too:
 * a bare `/players` redirects, and all locales would otherwise claim the same canonical.
 * `path` starts with a slash ("/players") or is "/" for the home page.
 */
export function localeAlternates(locale: string, path: string) {
  const suffix = path === '/' ? '' : path;
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [l, `/${l}${suffix}`]),
  );
  languages['x-default'] = `/${routing.defaultLocale}${suffix}`;
  return { canonical: `/${locale}${suffix}`, languages };
}
