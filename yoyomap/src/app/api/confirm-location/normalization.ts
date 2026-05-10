export function normalizeCountryIso2(raw: string): string | null {
  const normalized = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  return normalized;
}

export function normalizeRegionForGeocode(raw: string | null | undefined): string | undefined {
  const normalized = raw?.trim();
  return normalized ? normalized : undefined;
}

export function normalizeRegionForDb(raw: string | null | undefined): string | null {
  const normalized = raw?.trim();
  return normalized ? normalized : null;
}
