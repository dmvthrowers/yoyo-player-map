import test from 'node:test';
import assert from 'node:assert/strict';
import { filterEntries } from './filters.ts';

const base = {
  entity_type: 'person', is_visible: true, is_flagged: false, deleted_at: null,
  auto_hidden_by_reports: false, location_status: 'auto_geocoded',
};
const entries = [
  { ...base, id: 'visible-person' },
  { ...base, id: 'pending-shop', entity_type: 'shop', is_visible: false, location_status: 'needs_research' },
  { ...base, id: 'flagged-club', entity_type: 'club', is_visible: false, is_flagged: true },
  { ...base, id: 'auto-hidden', auto_hidden_by_reports: true },
  { ...base, id: 'deleted-flagged', is_flagged: true, deleted_at: '2026-10-01' },
  { ...base, id: 'legacy-no-type', entity_type: null },
];
const all = { entityFilter: 'all', statusFilter: 'all', locationStatusFilter: 'all' };
const ids = (f) => filterEntries(entries, { ...all, ...f }).map((e) => e.id);

test('no filters keeps everything', () => {
  assert.equal(ids({}).length, entries.length);
});

test('type filter treats a missing type as a person', () => {
  assert.deepEqual(ids({ entityFilter: 'person' }), ['visible-person', 'auto-hidden', 'deleted-flagged', 'legacy-no-type']);
  assert.deepEqual(ids({ entityFilter: 'shop' }), ['pending-shop']);
});

test('status filters', () => {
  assert.deepEqual(ids({ statusFilter: 'visible' }), ['visible-person', 'legacy-no-type']);
  assert.deepEqual(ids({ statusFilter: 'pending' }), ['pending-shop']);
  assert.deepEqual(ids({ statusFilter: 'flagged' }), ['flagged-club']);
  assert.deepEqual(ids({ statusFilter: 'auto_hidden' }), ['auto-hidden']);
});

test('location filter combines with the others', () => {
  assert.deepEqual(ids({ locationStatusFilter: 'needs_research' }), ['pending-shop']);
  assert.deepEqual(ids({ locationStatusFilter: 'needs_research', entityFilter: 'person' }), []);
});
