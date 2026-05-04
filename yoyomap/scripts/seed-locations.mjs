// Run with: pnpm seed-locations (or npm run seed-locations)
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local
// Safe to re-run: uses upsert with ignoreDuplicates throughout.

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import AdmZip from 'adm-zip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHUNK_SIZE = 500;
const POP_THRESHOLD = 50_000;

// ---------------------------------------------------------------------------
// Env loader — reads .env.local without requiring dotenv as a dependency
// ---------------------------------------------------------------------------
function loadEnv() {
  // Check next to the script first, then fall back to cwd (supports running cross-directory)
  const candidates = [resolve(__dirname, '../.env.local'), resolve(process.cwd(), '.env.local')];
  const envPath = candidates.find(p => existsSync(p));
  if (!envPath) return;
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip inline comments (e.g. "secret  # mark Sensitive in Vercel")
    const commentIdx = val.search(/\s+#/);
    if (commentIdx !== -1) val = val.slice(0, commentIdx).trim();
    // Strip surrounding quotes
    if (/^["'].*["']$/.test(val)) val = val.slice(1, -1);
    // Don't overwrite values already set in the process environment
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  console.error('Copy .env.local.example to .env.local and fill in your credentials.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fetchText(url) {
  console.log(`  Fetching ${url} …`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

async function fetchZipped(url, filename) {
  console.log(`  Fetching ${url} …`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buf);
  const entry = zip.getEntry(filename);
  if (!entry) throw new Error(`${filename} not found inside ${url}`);
  return zip.readAsText(entry);
}

// onConflict is optional. When omitted, PostgREST generates ON CONFLICT DO NOTHING
// (catch-all for every unique constraint) instead of targeting a specific one.
async function upsertBatch(table, rows, onConflict = null) {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const opts = { ignoreDuplicates: true };
    if (onConflict) opts.onConflict = onConflict;
    const { error } = await supabase.from(table).upsert(chunk, opts);
    if (error) throw new Error(`Upsert into ${table} failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n=== seed-locations: fetching GeoNames data ===\n');

  const [countryInfoText, admin1Text, citiesText] = await Promise.all([
    fetchText('https://download.geonames.org/export/dump/countryInfo.txt'),
    fetchText('https://download.geonames.org/export/dump/admin1CodesASCII.txt'),
    fetchZipped('https://download.geonames.org/export/dump/cities15000.zip', 'cities15000.txt'),
  ]);

  // ISO-2 → full country name  (countryInfo.txt col 0 = ISO2, col 4 = name)
  const countryNames = new Map();
  for (const line of countryInfoText.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const cols = t.split('\t');
    if (cols.length >= 5 && cols[0] && cols[4]) {
      countryNames.set(cols[0].trim(), cols[4].trim());
    }
  }

  // "CC.A1" → region name  (admin1CodesASCII.txt col 0 = key, col 1 = name)
  const admin1Map = new Map();
  for (const line of admin1Text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const cols = t.split('\t');
    if (cols.length >= 2 && cols[0] && cols[1]) {
      admin1Map.set(cols[0].trim(), cols[1].trim());
    }
  }

  // Parse cities (col 1=name, 8=country_code, 10=admin1_code, 14=population)
  const countryCodes = new Set();
  const regionKeys = new Set();   // "CC.A1"
  const rawCities = [];           // { countryCode, admin1Code, name }

  for (const line of citiesText.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const cols = t.split('\t');
    if (cols.length < 15) continue;
    if (parseInt(cols[14], 10) < POP_THRESHOLD) continue;

    const countryCode = cols[8].trim();
    const admin1Code  = cols[10].trim();
    const name        = cols[1].trim();  // display name, not asciiname
    if (!countryCode || !name) continue;

    countryCodes.add(countryCode);
    if (admin1Code) regionKeys.add(`${countryCode}.${admin1Code}`);
    rawCities.push({ countryCode, admin1Code, name });
  }

  // -------------------------------------------------------------------------
  // 1. Countries
  // -------------------------------------------------------------------------
  const countryRows = [...countryCodes].sort().map(code => ({
    code,
    name: countryNames.get(code) ?? code,
  }));
  console.log(`\nInserting ${countryRows.length} countries…`);
  await upsertBatch('countries', countryRows, 'code');

  // .range() is required — the default Supabase row limit is 1000, not unlimited.
  const { data: countries, error: cErr } = await supabase
    .from('countries')
    .select('id, code')
    .range(0, 499);
  if (cErr) throw new Error(`Failed to fetch countries: ${cErr.message}`);
  const countryIdMap = new Map(countries.map(c => [c.code, c.id]));

  // -------------------------------------------------------------------------
  // 2. Regions
  // -------------------------------------------------------------------------
  // regions has TWO unique constraints: (country_id, code) AND (country_id, name).
  // PostgreSQL's ON CONFLICT clause can only target one constraint at a time, so we
  // pre-fetch existing rows and filter out any candidate that would violate either one.
  const { data: existingRegs, error: erErr } = await supabase
    .from('regions')
    .select('country_id, code, name')
    .range(0, 9999);
  if (erErr) throw new Error(`Failed to fetch existing regions: ${erErr.message}`);
  const existingRegCodes = new Set((existingRegs ?? []).map(r => `${r.country_id}\x00${r.code}`));
  const existingRegNames = new Set((existingRegs ?? []).map(r => `${r.country_id}\x00${r.name}`));

  const seenRegionCodes = new Set();
  const seenRegionNames = new Set();
  const regionRows = [...regionKeys]
    .sort()
    .map(key => {
      const dotIdx = key.indexOf('.');
      const cc = key.slice(0, dotIdx);
      const a1 = key.slice(dotIdx + 1);
      return {
        country_id: countryIdMap.get(cc),
        code: a1,
        name: admin1Map.get(key) ?? a1,
      };
    })
    .filter(r => {
      if (r.country_id == null) return false;
      const codeKey = `${r.country_id}\x00${r.code}`;
      const nameKey = `${r.country_id}\x00${r.name}`;
      // Skip rows that already exist in DB (by code OR name)
      if (existingRegCodes.has(codeKey) || existingRegNames.has(nameKey)) return false;
      // Skip within-batch duplicates on either dimension
      if (seenRegionCodes.has(codeKey) || seenRegionNames.has(nameKey)) return false;
      seenRegionCodes.add(codeKey);
      seenRegionNames.add(nameKey);
      return true;
    });

  console.log(`Inserting ${regionRows.length} regions…`);
  await upsertBatch('regions', regionRows, 'country_id,code');

  const { data: regions, error: rErr } = await supabase
    .from('regions')
    .select('id, country_id, code')
    .range(0, 9999);
  if (rErr) throw new Error(`Failed to fetch regions: ${rErr.message}`);
  // key: "<countryId>.<regionCode>"
  const regionIdMap = new Map(regions.map(r => [`${r.country_id}.${r.code}`, r.id]));

  // -------------------------------------------------------------------------
  // 3. Cities
  //    Deduplicate in-memory — the DB unique constraint on (country_id,
  //    region_id, name) won't catch duplicates when region_id IS NULL because
  //    NULL ≠ NULL in PostgreSQL unique indexes.
  // -------------------------------------------------------------------------
  const seen = new Set();
  const cityRows = [];

  for (const city of rawCities) {
    const countryId = countryIdMap.get(city.countryCode);
    if (!countryId) continue;
    const regionId = city.admin1Code
      ? (regionIdMap.get(`${countryId}.${city.admin1Code}`) ?? null)
      : null;
    const dedupeKey = `${countryId}\x00${regionId ?? ''}\x00${city.name}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    cityRows.push({ country_id: countryId, region_id: regionId, name: city.name });
  }

  console.log(`Inserting ${cityRows.length} cities…`);
  await upsertBatch('cities', cityRows, 'country_id,region_id,name');

  console.log(
    `\n✓ Done. Seeded ${countryRows.length} countries, ` +
    `${regionRows.length} regions, ${cityRows.length} cities.`
  );
}

main().catch(err => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
