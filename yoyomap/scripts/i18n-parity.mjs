#!/usr/bin/env node
// Reports missing/empty translation keys across locales relative to en.json.
// Usage: node scripts/i18n-parity.mjs [--strict]
//   --strict  exit 1 if any non-en locale is below 95% complete

import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(__dir, '../messages');
const strict = process.argv.includes('--strict');

function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    const dotKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flatten(val, dotKey));
    } else {
      result[dotKey] = val;
    }
  }
  return result;
}

const enRaw = JSON.parse(readFileSync(resolve(messagesDir, 'en.json'), 'utf8'));
const enFlat = flatten(enRaw);
const enKeys = Object.keys(enFlat);
const total = enKeys.length;

const localeFiles = readdirSync(messagesDir)
  .filter(f => f.endsWith('.json') && f !== 'en.json')
  .sort();

const COL = { locale: 8, total: 7, present: 9, missing: 9, pct: 7 };
const header =
  'locale  '.padEnd(COL.locale) +
  'total  '.padStart(COL.total) +
  'present  '.padStart(COL.present) +
  'missing  '.padStart(COL.missing) +
  '%'.padStart(COL.pct);
const divider = '-'.repeat(header.length);

console.log(divider);
console.log(header);
console.log(divider);

let failStrict = false;

for (const file of localeFiles) {
  const locale = file.replace('.json', '');
  let localeFlat = {};
  try {
    localeFlat = flatten(JSON.parse(readFileSync(resolve(messagesDir, file), 'utf8')));
  } catch {
    console.error(`  ERROR: could not parse ${file}`);
    continue;
  }

  const missingKeys = enKeys.filter(k => !(k in localeFlat) || localeFlat[k] === '');
  const present = total - missingKeys.length;
  const pct = ((present / total) * 100).toFixed(1);

  const row =
    locale.padEnd(COL.locale) +
    String(total).padStart(COL.total) +
    String(present).padStart(COL.present) +
    String(missingKeys.length).padStart(COL.missing) +
    `${pct}%`.padStart(COL.pct);
  console.log(row);

  if (strict && parseFloat(pct) < 95) {
    failStrict = true;
  }
}

console.log(divider);

if (strict && failStrict) {
  console.error('\n--strict: one or more locales are below 95% complete.');
  process.exit(1);
}
