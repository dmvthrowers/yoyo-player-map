const US_STATE_ABBREV: Record<string, string> = {
  al: "Alabama", ak: "Alaska", az: "Arizona", ar: "Arkansas",
  ca: "California", co: "Colorado", ct: "Connecticut", de: "Delaware",
  fl: "Florida", ga: "Georgia", hi: "Hawaii", id: "Idaho",
  il: "Illinois", in: "Indiana", ia: "Iowa", ks: "Kansas",
  ky: "Kentucky", la: "Louisiana", me: "Maine", md: "Maryland",
  ma: "Massachusetts", mi: "Michigan", mn: "Minnesota", ms: "Mississippi",
  mo: "Missouri", mt: "Montana", ne: "Nebraska", nv: "Nevada",
  nh: "New Hampshire", nj: "New Jersey", nm: "New Mexico", ny: "New York",
  nc: "North Carolina", nd: "North Dakota", oh: "Ohio", ok: "Oklahoma",
  or: "Oregon", pa: "Pennsylvania", ri: "Rhode Island", sc: "South Carolina",
  sd: "South Dakota", tn: "Tennessee", tx: "Texas", ut: "Utah",
  vt: "Vermont", va: "Virginia", wa: "Washington", wv: "West Virginia",
  wi: "Wisconsin", wy: "Wyoming", dc: "District of Columbia",
  // Canadian provinces
  ab: "Alberta", bc: "British Columbia", mb: "Manitoba", nb: "New Brunswick",
  nl: "Newfoundland and Labrador", ns: "Nova Scotia", on: "Ontario",
  pe: "Prince Edward Island", qc: "Quebec", sk: "Saskatchewan",
  nt: "Northwest Territories", nu: "Nunavut", yt: "Yukon",
};

/**
 * Normalize a region value for display.
 * - Returns null for all-numeric values (postal codes, FIPS codes stored as regions)
 * - Expands 2-letter abbreviations to full names where known
 * - Returns null for empty/whitespace-only input
 */
export function normalizeRegionDisplay(region: string | null | undefined): string | null {
  if (!region) return null;
  const trimmed = region.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return null;
  const lower = trimmed.toLowerCase();
  return US_STATE_ABBREV[lower] ?? trimmed;
}
