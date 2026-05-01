// URL-safe slug helpers for /players/[country]/[region]/[city] routes.
// Slugs are lowercase, hyphenated, ASCII-only. Round-tripping is best-effort:
// we keep a server-side lookup against the DB rather than trying to "unslug".

export function slugify(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function locationPath(
  country: string,
  region?: string | null,
  city?: string | null,
): string {
  const parts = ['/players', slugify(country)];
  if (region) parts.push(region === '_other' ? '_other' : slugify(region));
  if (city) parts.push(slugify(city));
  return parts.join('/');
}
