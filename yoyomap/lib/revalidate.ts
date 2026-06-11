import { revalidatePath, revalidateTag } from 'next/cache';
import { routing } from '../i18n/routing';
import { slugify } from './locationSlug';

/**
 * Revalidate every cached page that could display a given entry.
 * Called from API routes after publish / update / delete / moderation actions
 * so users (and Google) see changes within seconds instead of waiting for the
 * 1-hour ISR window to expire.
 *
 * Cheap on free tier: revalidatePath() only invalidates the cache; the next
 * visitor triggers exactly one Supabase query to rebuild the page.
 */
export function revalidateEntryLocations(loc: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
}) {
  // Global views: /[locale]/map and /[locale]/players.
  // revalidatePath('/[locale]/path', 'page') uses the bracket syntax as a wildcard
  // so Next.js invalidates every locale variant (e.g. /en/map, /ja/map).
  revalidateTag('public-entries');
  revalidatePath('/[locale]/map', 'page');
  revalidatePath('/[locale]/players', 'page');
  revalidatePath('/sitemap.xml');

  if (!loc.country) return;
  const c = slugify(loc.country);
  if (!c) return;

  // Location-specific pages: loop over each locale with the literal slug so the
  // path is unambiguous (mixing [locale] with a concrete slug value is not reliable).
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/players/${c}`);
    if (!loc.region) continue;
    const r = slugify(loc.region);
    if (!r) continue;
    revalidatePath(`/${locale}/players/${c}/${r}`);
    if (!loc.city) continue;
    const ci = slugify(loc.city);
    if (!ci) continue;
    revalidatePath(`/${locale}/players/${c}/${r}/${ci}`);
  }
}
