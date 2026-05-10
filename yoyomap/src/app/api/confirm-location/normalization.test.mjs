import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCountryIso2,
  normalizeRegionForDb,
  normalizeRegionForGeocode,
} from './normalization.ts';

test('normalizeCountryIso2 uppercases and trims valid ISO country codes', () => {
  assert.equal(normalizeCountryIso2(' us '), 'US');
  assert.equal(normalizeCountryIso2('ca'), 'CA');
});

test('normalizeCountryIso2 rejects invalid values', () => {
  assert.equal(normalizeCountryIso2('usa'), null);
  assert.equal(normalizeCountryIso2('1a'), null);
  assert.equal(normalizeCountryIso2(''), null);
});

test('region normalization keeps geocode and DB persistence representations explicit', () => {
  assert.equal(normalizeRegionForGeocode('  '), undefined);
  assert.equal(normalizeRegionForDb('  '), null);

  assert.equal(normalizeRegionForGeocode('  DC  '), 'DC');
  assert.equal(normalizeRegionForDb('  DC  '), 'DC');
});
