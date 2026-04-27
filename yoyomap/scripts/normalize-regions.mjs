import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import AdmZip from 'adm-zip';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const candidates = [resolve(__dirname, '../.env.local'), resolve(process.cwd(), '.env.local')];
  const envPath = candidates.find(p => existsSync(p));
  if (!envPath) {
    throw new Error('No .env.local found');
  }

  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    const commentIdx = val.search(/\s+#/);
    if (commentIdx !== -1) val = val.slice(0, commentIdx).trim();
    if (/^["'].*["']$/.test(val)) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const REGION_NAME_SUFFIXES = [
  ' region',
  ' province',
  ' state',
  ' prefecture',
  ' department',
  ' county',
  ' district',
  ' governorate',
  ' oblast',
  ' municipality',
  ' metro',
  ' metropolitana',
];

const MANUAL_REGION_ALIASES = {
  'CA': {
    'ab': { code: '01', name: 'Alberta' },
    'alberta': { code: '01', name: 'Alberta' },
    'bc': { code: '02', name: 'British Columbia' },
    'british-columbia': { code: '02', name: 'British Columbia' },
    'mb': { code: '03', name: 'Manitoba' },
    'manitoba': { code: '03', name: 'Manitoba' },
    'nb': { code: '04', name: 'New Brunswick' },
    'new-brunswick': { code: '04', name: 'New Brunswick' },
    'nl': { code: '05', name: 'Newfoundland and Labrador' },
    'newfoundland-and-labrador': { code: '05', name: 'Newfoundland and Labrador' },
    'ns': { code: '07', name: 'Nova Scotia' },
    'nova-scotia': { code: '07', name: 'Nova Scotia' },
    'on': { code: '08', name: 'Ontario' },
    'ontario': { code: '08', name: 'Ontario' },
    'qc': { code: '10', name: 'Quebec' },
    'quebec': { code: '10', name: 'Quebec' },
    'sk': { code: '11', name: 'Saskatchewan' },
    'saskatchewan': { code: '11', name: 'Saskatchewan' },
  },
  'MX': {
    'cdmx': { code: '09', name: 'Mexico City' },
    'mexico-city': { code: '09', name: 'Mexico City' },
  },
  'HN': {
    'fm': { code: '08', name: 'Francisco Morazan Department' },
    'francisco-morazan': { code: '08', name: 'Francisco Morazan Department' },
  },
};

function normalizeWhitespace(value) {
  return value ? value.replace(/\s+/g, ' ').trim() : '';
}

function slugify(value) {
  return normalizeWhitespace(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripRegionSuffixes(value) {
  let current = slugify(value);
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of REGION_NAME_SUFFIXES) {
      const suffixSlug = slugify(suffix);
      if (current.endsWith(`-${suffixSlug}`)) {
        current = current.slice(0, -(`-${suffixSlug}`).length);
        changed = true;
      } else if (current === suffixSlug) {
        current = '';
        changed = true;
      }
    }
  }
  return current;
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

async function fetchZipped(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buf);
  const entry = zip.getEntry(filename);
  if (!entry) throw new Error(`${filename} not found in ${url}`);
  return zip.readAsText(entry);
}

async function loadReferenceRegions() {
  const [countryInfoText, admin1Text] = await Promise.all([
    fetchText('https://download.geonames.org/export/dump/countryInfo.txt'),
    fetchText('https://download.geonames.org/export/dump/admin1CodesASCII.txt'),
  ]);

  const countryNameByCode = new Map();
  for (const line of countryInfoText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const cols = trimmed.split('\t');
    if (cols.length >= 5 && cols[0] && cols[4]) {
      countryNameByCode.set(cols[0].trim(), cols[4].trim());
    }
  }

  const byCountry = new Map();
  for (const line of admin1Text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const cols = trimmed.split('\t');
    if (cols.length < 2 || !cols[0] || !cols[1]) continue;

    const key = cols[0].trim();
    const dotIdx = key.indexOf('.');
    if (dotIdx === -1) continue;

    const countryCode = key.slice(0, dotIdx);
    const code = key.slice(dotIdx + 1);
    const name = normalizeWhitespace(cols[1]);
    if (!code || !name) continue;

    if (!byCountry.has(countryCode)) {
      byCountry.set(countryCode, { byCode: new Map(), bySlug: new Map(), countryName: countryNameByCode.get(countryCode) ?? countryCode });
    }

    const bucket = byCountry.get(countryCode);
    const region = { code, name };
    bucket.byCode.set(code.toUpperCase(), region);

    const slugs = new Set([slugify(name), stripRegionSuffixes(name)]);
    for (const slug of slugs) {
      if (slug && !bucket.bySlug.has(slug)) {
        bucket.bySlug.set(slug, region);
      }
    }
  }

  for (const [countryCode, aliases] of Object.entries(MANUAL_REGION_ALIASES)) {
    if (!byCountry.has(countryCode)) {
      byCountry.set(countryCode, { byCode: new Map(), bySlug: new Map(), countryName: countryCode });
    }
    const bucket = byCountry.get(countryCode);
    for (const [alias, region] of Object.entries(aliases)) {
      bucket.bySlug.set(alias, region);
    }
  }

  return byCountry;
}

function resolveCanonicalRegion(countryCode, row, referenceRegions) {
  const refs = referenceRegions.get(countryCode);
  if (!refs) return null;

  const code = normalizeWhitespace(row.code).toUpperCase();
  const name = normalizeWhitespace(row.name);
  const candidates = [
    refs.byCode.get(code),
    refs.bySlug.get(slugify(name)),
    refs.bySlug.get(stripRegionSuffixes(name)),
    refs.bySlug.get(slugify(code)),
    refs.bySlug.get(stripRegionSuffixes(code)),
  ].filter(Boolean);

  return candidates[0] ?? null;
}

async function loadRows(table, columns) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function updateEntryRegions(oldRegionId, newRegionId, canonicalName) {
  const entries = await loadRows('entries', 'id, region_id, region, deleted_at');
  const affected = entries.filter(entry => entry.deleted_at == null && entry.region_id === oldRegionId);
  for (const entry of affected) {
    const { error } = await supabase
      .from('entries')
      .update({ region_id: newRegionId, region: canonicalName })
      .eq('id', entry.id);
    if (error) throw error;
  }
  return affected.length;
}

async function mergeCitiesForRegion(oldRegionId, newRegionId) {
  const cities = await loadRows('cities', 'id, country_id, region_id, name');
  const entries = await loadRows('entries', 'id, city_id, deleted_at');
  const oldCities = cities.filter(city => city.region_id === oldRegionId);
  const targetCities = cities.filter(city => city.region_id === newRegionId);
  const targetByKey = new Map(
    targetCities.map(city => [`${city.country_id}|${city.name.toLowerCase()}`, city])
  );

  let merged = 0;
  let retargetedEntries = 0;
  for (const city of oldCities) {
    const key = `${city.country_id}|${city.name.toLowerCase()}`;
    const existing = targetByKey.get(key);

    if (existing) {
      const entryMatches = entries.filter(entry => entry.deleted_at == null && entry.city_id === city.id);
      for (const entry of entryMatches) {
        const { error: entryError } = await supabase
          .from('entries')
          .update({ city_id: existing.id })
          .eq('id', entry.id);
        if (entryError) throw entryError;
        retargetedEntries += 1;
      }

      const { error: deleteError } = await supabase
        .from('cities')
        .delete()
        .eq('id', city.id);
      if (deleteError) throw deleteError;
      merged += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from('cities')
      .update({ region_id: newRegionId })
      .eq('id', city.id);
    if (updateError) throw updateError;
    merged += 1;
  }

  return { merged, retargetedEntries };
}

async function normalizeEntriesToRegionNames(regionRows) {
  for (const region of regionRows) {
    const { error } = await supabase
      .from('entries')
      .update({ region: region.name })
      .eq('region_id', region.id)
      .neq('region', region.name)
      .is('deleted_at', null);
    if (error) throw error;
  }
}

function isPlaceholderRegion(region) {
  const code = normalizeWhitespace(region.code);
  const name = normalizeWhitespace(region.name);
  if (!code || !name) return false;
  if (code.toLowerCase() !== name.toLowerCase()) return false;
  return /^[a-z0-9-]{1,8}$/i.test(code);
}

async function deleteUnusedPlaceholderRegions() {
  const [regions, entries, cities] = await Promise.all([
    loadRows('regions', 'id, code, name'),
    loadRows('entries', 'region_id, deleted_at'),
    loadRows('cities', 'region_id'),
  ]);

  const usedRegionIds = new Set();
  for (const entry of entries) {
    if (entry.deleted_at == null && entry.region_id != null) {
      usedRegionIds.add(entry.region_id);
    }
  }
  for (const city of cities) {
    if (city.region_id != null) {
      usedRegionIds.add(city.region_id);
    }
  }

  let deleted = 0;
  for (const region of regions) {
    if (usedRegionIds.has(region.id)) continue;
    if (!isPlaceholderRegion(region)) continue;

    const { error } = await supabase
      .from('regions')
      .delete()
      .eq('id', region.id);
    if (error) throw error;
    deleted += 1;
  }

  return deleted;
}

async function main() {
  console.log('\n=== normalize-regions ===\n');

  const referenceRegions = await loadReferenceRegions();
  const countries = await loadRows('countries', 'id, code, name');
  const regions = await loadRows('regions', 'id, country_id, code, name');

  const countryById = new Map(countries.map(country => [country.id, country]));
  const regionsByCountry = new Map();
  for (const region of regions) {
    if (!regionsByCountry.has(region.country_id)) {
      regionsByCountry.set(region.country_id, []);
    }
    regionsByCountry.get(region.country_id).push(region);
  }

  let renamed = 0;
  let inserted = 0;
  let mergedRegions = 0;
  let retargetedEntries = 0;
  let touchedCities = 0;
  const unresolved = [];
  const removedRegionIds = new Set();

  for (const region of regions) {
    if (removedRegionIds.has(region.id)) {
      continue;
    }

    const country = countryById.get(region.country_id);
    if (!country) continue;

    const canonical = resolveCanonicalRegion(country.code, region, referenceRegions);
    if (!canonical) {
      unresolved.push({
        country: country.code,
        id: region.id,
        code: region.code,
        name: region.name,
      });
      continue;
    }

    const countryRegions = regionsByCountry.get(region.country_id) ?? [];
    const codeMatch = countryRegions.find(candidate => candidate.code.toUpperCase() === canonical.code.toUpperCase()) ?? null;
    const nameMatch = countryRegions.find(candidate => slugify(candidate.name) === slugify(canonical.name)) ?? null;
    let target = codeMatch ?? nameMatch ?? null;

    if (!target) {
      const { data: insertedRow, error: insertError } = await supabase
        .from('regions')
        .insert({
          country_id: region.country_id,
          code: canonical.code,
          name: canonical.name,
        })
        .select('id, country_id, code, name')
        .single();
      if (insertError || !insertedRow) throw insertError ?? new Error('Region insert failed');

      target = insertedRow;
      countryRegions.push(insertedRow);
      regionsByCountry.set(region.country_id, countryRegions);
      inserted += 1;
    }

    if (target.id === region.id) {
      const hasConflictingSibling =
        (codeMatch && codeMatch.id !== region.id) ||
        (nameMatch && nameMatch.id !== region.id);

      if (hasConflictingSibling) {
        continue;
      }

      if (region.code !== canonical.code || region.name !== canonical.name) {
        const { error: updateError } = await supabase
          .from('regions')
          .update({ code: canonical.code, name: canonical.name })
          .eq('id', region.id);
        if (updateError) throw updateError;
        renamed += 1;
      }
      continue;
    }

    retargetedEntries += await updateEntryRegions(region.id, target.id, canonical.name);
    const cityMerge = await mergeCitiesForRegion(region.id, target.id);
    touchedCities += cityMerge.merged;
    retargetedEntries += cityMerge.retargetedEntries;

    const { error: deleteRegionError } = await supabase
      .from('regions')
      .delete()
      .eq('id', region.id);
    if (deleteRegionError) throw deleteRegionError;

    const idx = countryRegions.findIndex(candidate => candidate.id === region.id);
    if (idx >= 0) {
      countryRegions.splice(idx, 1);
    }
    removedRegionIds.add(region.id);

    if (target.code !== canonical.code || target.name !== canonical.name) {
      const { error: updateError } = await supabase
        .from('regions')
        .update({ code: canonical.code, name: canonical.name })
        .eq('id', target.id);
      if (updateError) throw updateError;

      target.code = canonical.code;
      target.name = canonical.name;
      renamed += 1;
    }

    mergedRegions += 1;
  }

  const refreshedRegions = await loadRows('regions', 'id, country_id, code, name');
  await normalizeEntriesToRegionNames(refreshedRegions);
  const deletedPlaceholders = await deleteUnusedPlaceholderRegions();

  const unresolvedWithUsage = [];
  if (unresolved.length > 0) {
    const entryRows = await loadRows('entries', 'id, region_id, deleted_at');
    const cityRows = await loadRows('cities', 'id, region_id');
    const entryCountByRegion = new Map();
    const cityCountByRegion = new Map();

    for (const entry of entryRows) {
      if (entry.deleted_at != null || entry.region_id == null) continue;
      entryCountByRegion.set(entry.region_id, (entryCountByRegion.get(entry.region_id) ?? 0) + 1);
    }
    for (const city of cityRows) {
      if (city.region_id == null) continue;
      cityCountByRegion.set(city.region_id, (cityCountByRegion.get(city.region_id) ?? 0) + 1);
    }

    for (const row of unresolved) {
      unresolvedWithUsage.push({
        ...row,
        entries: entryCountByRegion.get(row.id) ?? 0,
        cities: cityCountByRegion.get(row.id) ?? 0,
      });
    }
  }

  console.log(JSON.stringify({
    renamed,
    inserted,
    mergedRegions,
    retargetedEntries,
    touchedCities,
    deletedPlaceholders,
    unresolved: unresolvedWithUsage,
  }, null, 2));
  console.log('\nDone.\n');
}

main().catch(err => {
  console.error('\nNormalization failed:', err);
  process.exit(1);
});
