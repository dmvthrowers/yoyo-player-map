import test from 'node:test';
import assert from 'node:assert/strict';
import {
  claimSubmission,
  dedupeKeys,
  stableStringify,
  DONE_TTL_SECONDS,
  PENDING_TTL_SECONDS,
} from './submit-dedupe.ts';

// In-memory stand-in for the Upstash client: SET NX, GET (parses JSON like Upstash), DEL.
function fakeStore() {
  const map = new Map();
  const ttl = new Map();
  return {
    map,
    ttl,
    async set(key, value, opts) {
      if (opts.nx && map.has(key)) return null;
      map.set(key, value);
      ttl.set(key, opts.ex);
      return 'OK';
    },
    async get(key) {
      const v = map.get(key);
      return v === undefined ? null : JSON.parse(v);
    },
    async del(...keys) {
      keys.forEach((k) => { map.delete(k); ttl.delete(k); });
      return keys.length;
    },
  };
}

const form = { entityType: 'person', displayName: 'Sam', email: 'sam@example.com', city_id: 1, socials: { instagram: 'sam' } };

test('stableStringify ignores key order and per-attempt fields', () => {
  const a = stableStringify({ b: 1, a: { y: 2, x: 1 }, turnstileToken: 't1', honeypot: '' });
  const b = stableStringify({ a: { x: 1, y: 2 }, b: 1, turnstileToken: 't2' });
  assert.equal(a, b);
});

test('dedupeKeys adds the client key only when it is well formed', async () => {
  assert.equal((await dedupeKeys(form, null)).length, 1);
  assert.equal((await dedupeKeys(form, 'short')).length, 1);
  assert.equal((await dedupeKeys(form, 'bad key with spaces!!')).length, 1);
  const keys = await dedupeKeys(form, '3b0c7f0e-8d1a-4f55-9c3e-2a7d1b9e6f10');
  assert.equal(keys.length, 2);
  assert.ok(keys.every((k) => /^submit:(fp|idem):[0-9a-f]{64}$/.test(k)), 'keys hold hashes only');
  assert.ok(!keys.join().includes('sam'), 'no form contents in keys');
});

test('the same form hashes the same way across attempts', async () => {
  const [a] = await dedupeKeys({ ...form, turnstileToken: 'one' }, null);
  const [b] = await dedupeKeys({ ...form, turnstileToken: 'two' }, null);
  const [c] = await dedupeKeys({ ...form, displayName: 'Sammy' }, null);
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('a finished submission is replayed', async () => {
  const store = fakeStore();
  const keys = await dedupeKeys(form, 'key-0000000001');
  const first = await claimSubmission(store, keys);
  assert.equal(first.kind, 'new');
  assert.ok([...store.ttl.values()].every((t) => t === PENDING_TTL_SECONDS));
  await first.finish({ message: 'Check your email', emailStatus: 'sent' });
  assert.ok([...store.ttl.values()].every((t) => t === DONE_TTL_SECONDS));

  const again = await claimSubmission(store, keys);
  assert.equal(again.kind, 'replay');
  assert.deepEqual(again.body, { message: 'Check your email', emailStatus: 'sent' });
});

test('a second request while the first runs is told to wait', async () => {
  const store = fakeStore();
  const keys = await dedupeKeys(form, null);
  assert.equal((await claimSubmission(store, keys)).kind, 'new');
  assert.equal((await claimSubmission(store, keys)).kind, 'in_progress');
});

test('a released claim can be retried', async () => {
  const store = fakeStore();
  const keys = await dedupeKeys(form, 'key-0000000002');
  const first = await claimSubmission(store, keys);
  await first.release();
  assert.equal(store.map.size, 0);
  assert.equal((await claimSubmission(store, keys)).kind, 'new');
});

test('the same client key with different details still matches, and frees its other claim', async () => {
  const store = fakeStore();
  const first = await claimSubmission(store, await dedupeKeys(form, 'key-0000000003'));
  await first.finish({ message: 'ok' });
  const edited = await dedupeKeys({ ...form, displayName: 'Sammy' }, 'key-0000000003');
  const again = await claimSubmission(store, edited);
  assert.equal(again.kind, 'replay');
  assert.equal(store.map.has(edited[0]), false, 'fingerprint claim given back');
});

test('no store, or a failing store, lets the submission through', async () => {
  const keys = await dedupeKeys(form, null);
  assert.equal((await claimSubmission(null, keys)).kind, 'new');
  const broken = { set: async () => { throw new Error('down'); }, get: async () => null, del: async () => 0 };
  const orig = console.error; console.error = () => {};
  try {
    assert.equal((await claimSubmission(broken, keys)).kind, 'new');
  } finally { console.error = orig; }
});
