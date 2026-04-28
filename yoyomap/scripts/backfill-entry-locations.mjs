// Backfill legacy entry locations into normalized country_id / region_id / city_id FKs.
// Run with: node backfill-entry-locations.mjs
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Env loader
// ---------------------------------------------------------------------------
function loadEnv() {
  const candidates = [
    resolve(__dirname, '../yoyomap/yoyo-player-map/yoyomap/.env.local'),
    resolve(process.cwd(), '.env.local'),
  ];
  const envPath = candidates.find(p => existsSync(p));
  if (!envPath) throw new Error('No .env.local found');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ---------------------------------------------------------------------------
// Country alias map (mirrors v13 migration)
// ---------------------------------------------------------------------------
const COUNTRY_ALIASES = {
  'us': 'US', 'usa': 'US', 'united states': 'US', 'united-states': 'US',
  'ca': 'CA', 'canada': 'CA',
  'uk': 'GB', 'gb': 'GB', 'united kingdom': 'GB', 'united-kingdom': 'GB',
  'mx': 'MX', 'mexico': 'MX',
  'br': 'BR', 'brazil': 'BR',
  'ar': 'AR', 'argentina': 'AR',
  'cl': 'CL', 'chile': 'CL',
  'co': 'CO', 'colombia': 'CO',
  'de': 'DE', 'germany': 'DE',
  'fr': 'FR', 'france': 'FR',
  'es': 'ES', 'spain': 'ES',
  'it': 'IT', 'italy': 'IT',
  'be': 'BE', 'belgium': 'BE',
  'nl': 'NL', 'netherlands': 'NL',
  'cz': 'CZ', 'czech republic': 'CZ', 'czech-republic': 'CZ',
  'hu': 'HU', 'hungary': 'HU',
  'pl': 'PL', 'poland': 'PL',
  'ua': 'UA', 'ukraine': 'UA',
  'jp': 'JP', 'japan': 'JP',
  'kr': 'KR', 'south korea': 'KR', 'south-korea': 'KR',
  'cn': 'CN', 'china': 'CN',
  'tw': 'TW', 'taiwan': 'TW',
  'sg': 'SG', 'singapore': 'SG',
  'ph': 'PH', 'philippines': 'PH',
  'in': 'IN', 'india': 'IN',
  'au': 'AU', 'australia': 'AU',
  'nz': 'NZ', 'new zealand': 'NZ', 'new-zealand': 'NZ',
  'hn': 'HN', 'honduras': 'HN',
};

// US state abbreviations for inferring country from region code
const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]);

function resolveCountryCode(raw, regionRaw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  const slugNorm = trimmed.toLowerCase();
  // Alias map first — handles UK→GB, usa→US, etc.
  if (COUNTRY_ALIASES[slugNorm]) return COUNTRY_ALIASES[slugNorm];
  // Slug-based alias
  const slug = slugNorm.replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  if (COUNTRY_ALIASES[slug]) return COUNTRY_ALIASES[slug];
  // Unknown/null-ish country codes — try inferring from region
  if (/^un$/i.test(trimmed) || !trimmed) {
    const region = regionRaw?.trim().toUpperCase();
    if (region && US_STATES.has(region)) return 'US';
    return null;
  }
  // Raw 2-letter code (valid ISO only — verified against countryByCode later)
  if (/^[a-zA-Z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return null;
}

function normStr(s) {
  return s ? s.replace(/\s+/g, ' ').trim() : null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n=== backfill-entry-locations ===\n');

  // Fetch all non-deleted entries
  const { data: entries, error: entriesErr } = await supabase
    .from('entries')
    .select('id, display_name, country, region, city, country_id, region_id, city_id')
    .is('deleted_at', null);
  if (entriesErr) throw entriesErr;
  console.log(`Fetched ${entries.length} active entries`);

  // Load lookup tables
  const { data: countries } = await supabase.from('countries').select('id, code, name');
  const { data: regions } = await supabase.from('regions').select('id, country_id, code, name');
  const { data: cities } = await supabase.from('cities').select('id, country_id, region_id, name');

  // Index for fast lookup
  const countryByCode = Object.fromEntries(countries.map(c => [c.code, c]));
  // regions by country_id -> array
  const regionsByCountry = {};
  for (const r of regions) {
    (regionsByCountry[r.country_id] ||= []).push(r);
  }
  // cities by country_id+region_id -> array
  const citiesByKey = {};
  for (const c of cities) {
    const key = `${c.country_id}:${c.region_id ?? 'null'}`;
    (citiesByKey[key] ||= []).push(c);
    // also index under country only (for null-region fallback)
    const keyNoRegion = `${c.country_id}:null`;
    if (c.region_id === null) {
      // already covered above
    }
  }

  let updated = 0;
  let skipped = 0;
  let failed = [];

  for (const entry of entries) {
    const countryCode = resolveCountryCode(entry.country, entry.region);
    const country = countryCode ? countryByCode[countryCode] : null;
    const cityName = normStr(entry.city);
    const regionName = normStr(entry.region);

    // Resolve region
    let region = null;
    if (country && regionName) {
      const regionList = regionsByCountry[country.id] || [];
      region = regionList.find(r =>
        r.name.toLowerCase() === regionName.toLowerCase() ||
        r.code.toLowerCase() === regionName.toLowerCase() ||
        r.code === regionName.toUpperCase().slice(0, 32)
      ) || null;
    }

    // Resolve city — try with region first, then without
    let city = null;
    if (country && cityName) {
      const regionId = region?.id ?? null;
      const key = `${country.id}:${regionId ?? 'null'}`;
      const cityList = citiesByKey[key] || [];
      city = cityList.find(c => c.name.toLowerCase() === cityName.toLowerCase()) || null;

      // Fallback: try any city in country matching name regardless of region
      if (!city) {
        for (const cl of Object.values(citiesByKey)) {
          const match = cl.find(c => c.country_id === country.id && c.name.toLowerCase() === cityName.toLowerCase());
          if (match) { city = match; break; }
        }
      }
    }

    // Check if anything needs updating
    const newCountryId = country?.id ?? null;
    const newRegionId = region?.id ?? null;
    const newCityId = city?.id ?? null;

    const needsUpdate =
      entry.country_id !== newCountryId ||
      entry.region_id !== newRegionId ||
      entry.city_id !== newCityId;

    if (!needsUpdate) { skipped++; continue; }

    const { error: updateErr } = await supabase
      .from('entries')
      .update({
        country_id: newCountryId,
        region_id: newRegionId,
        city_id: newCityId,
        ...(countryCode ? { country: countryCode } : {}),
      })
      .eq('id', entry.id);

    if (updateErr) {
      failed.push({ id: entry.id, name: entry.display_name, error: updateErr.message });
    } else {
      updated++;
    }
  }

  console.log(`\nResults:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Already correct: ${skipped}`);
  console.log(`  Failed: ${failed.length}`);

  if (failed.length) {
    console.log('\nFailed entries:');
    for (const f of failed) console.log(`  [${f.id}] ${f.name}: ${f.error}`);
  }

  // Diagnostics: entries still missing FKs
  const { data: unresolved } = await supabase
    .from('entries')
    .select('id, display_name, country, region, city, country_id, region_id, city_id')
    .is('deleted_at', null)
    .or('country_id.is.null,city_id.is.null');

  if (unresolved?.length) {
    console.log(`\nEntries still needing manual attention (${unresolved.length}):`);
    for (const e of unresolved) {
      const issue = !e.country_id ? 'unmapped_country' : !e.city_id ? 'unmapped_city' : 'unknown';
      console.log(`  [${e.id}] "${e.display_name}" — ${e.country} / ${e.region} / ${e.city} — ${issue}`);
    }
  } else {
    console.log('\n✓ All entries have country_id and city_id resolved.');
  }

  console.log('\nDone.\n');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
