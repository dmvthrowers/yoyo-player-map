/**
 * Data cleanup script for known bad location entries.
 *
 * Issues fixed:
 * 1. All-numeric region values (postal codes / FIPS codes stored as region names)
 *    → region and region_id cleared to null
 * 2. Two-letter US/CA state abbreviations stored as region names
 *    → expanded to full names, region_id updated to matching canonical region if found
 * 3. Entries with country="UA" but city in UAE context (e.g. Dubai)
 *    → country updated to "AE", country_id updated to UAE's record
 *
 * Run with:
 *   DATABASE_URL=... pnpm -F @workspace/scripts fix-location-data
 */

import { db, pool, entriesTable, countriesTable, regionsTable } from "@workspace/db";
import { eq, and, isNull, isNotNull } from "drizzle-orm";

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
  ab: "Alberta", bc: "British Columbia", mb: "Manitoba", nb: "New Brunswick",
  nl: "Newfoundland and Labrador", ns: "Nova Scotia", on: "Ontario",
  pe: "Prince Edward Island", qc: "Quebec", sk: "Saskatchewan",
};

async function fixNumericRegions(): Promise<number> {
  const entries = await db
    .select({ id: entriesTable.id, region: entriesTable.region })
    .from(entriesTable)
    .where(and(isNull(entriesTable.deleted_at), isNotNull(entriesTable.region)));

  let count = 0;
  for (const entry of entries) {
    if (!entry.region) continue;
    if (/^\d+$/.test(entry.region.trim())) {
      await db
        .update(entriesTable)
        .set({ region: null, region_id: null })
        .where(eq(entriesTable.id, entry.id));
      console.log(`  cleared all-numeric region "${entry.region}" for entry ${entry.id}`);
      count++;
    }
  }
  return count;
}

async function expandRegionAbbreviations(): Promise<number> {
  const entries = await db
    .select({
      id: entriesTable.id,
      region: entriesTable.region,
      region_id: entriesTable.region_id,
      country_id: entriesTable.country_id,
    })
    .from(entriesTable)
    .where(and(isNull(entriesTable.deleted_at), isNotNull(entriesTable.region)));

  const allRegions = await db
    .select({ id: regionsTable.id, name: regionsTable.name, country_id: regionsTable.country_id })
    .from(regionsTable);

  let count = 0;
  for (const entry of entries) {
    if (!entry.region) continue;
    const lower = entry.region.trim().toLowerCase();
    const expanded = US_STATE_ABBREV[lower];
    if (!expanded) continue;

    const match = allRegions.find(
      (r) =>
        r.country_id === entry.country_id &&
        r.name.toLowerCase() === expanded.toLowerCase(),
    );

    await db
      .update(entriesTable)
      .set({ region: expanded, region_id: match?.id ?? entry.region_id })
      .where(eq(entriesTable.id, entry.id));

    console.log(`  expanded "${entry.region}" → "${expanded}" for entry ${entry.id}`);
    count++;
  }
  return count;
}

async function fixUaeEntries(): Promise<number> {
  const uaEntries = await db
    .select({ id: entriesTable.id, city: entriesTable.city })
    .from(entriesTable)
    .where(and(eq(entriesTable.country, "UA"), isNull(entriesTable.deleted_at)));

  if (uaEntries.length === 0) return 0;

  const [aeCountry] = await db
    .select({ id: countriesTable.id })
    .from(countriesTable)
    .where(eq(countriesTable.code, "AE"))
    .limit(1);

  if (!aeCountry) {
    console.warn("  AE country record not found, skipping UAE fix");
    return 0;
  }

  const uaeCities = new Set([
    "dubai", "abu dhabi", "sharjah", "ajman",
    "ras al khaimah", "fujairah", "umm al quwain",
  ]);

  let count = 0;
  for (const entry of uaEntries) {
    if (uaeCities.has(entry.city.trim().toLowerCase())) {
      await db
        .update(entriesTable)
        .set({ country: "AE", country_id: aeCountry.id })
        .where(eq(entriesTable.id, entry.id));
      console.log(`  updated entry ${entry.id} (city: ${entry.city}): UA → AE`);
      count++;
    }
  }
  return count;
}

async function main() {
  console.log("\n=== fix-location-data ===\n");

  console.log("Step 1: Clear all-numeric region values (postal codes / FIPS codes)…");
  const numericFixed = await fixNumericRegions();
  console.log(`  → ${numericFixed} entr${numericFixed === 1 ? "y" : "ies"} fixed\n`);

  console.log("Step 2: Expand 2-letter region abbreviations to full names…");
  const abbrevFixed = await expandRegionAbbreviations();
  console.log(`  → ${abbrevFixed} entr${abbrevFixed === 1 ? "y" : "ies"} fixed\n`);

  console.log("Step 3: Fix entries with country=UA but city in UAE…");
  const uaeFixed = await fixUaeEntries();
  console.log(`  → ${uaeFixed} entr${uaeFixed === 1 ? "y" : "ies"} fixed\n`);

  console.log("Done.\n");
  await pool.end();
}

main().catch((err: unknown) => {
  console.error("\nScript failed:", err);
  process.exit(1);
});
