import { revalidatePath } from 'next/cache';
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
  // Always invalidate the global views.
  revalidatePath('/map');
  revalidatePath('/players');
  revalidatePath('/sitemap.xml');

  if (!loc.country) return;
  const c = slugify(loc.country);
  if (!c) return;
  revalidatePath(`/players/${c}`);
  if (!loc.region) return;
  const r = slugify(loc.region);
  if (!r) return;
  revalidatePath(`/players/${c}/${r}`);
  if (!loc.city) return;
  const ci = slugify(loc.city);
  if (!ci) return;
  revalidatePath(`/players/${c}/${r}/${ci}`);
}
