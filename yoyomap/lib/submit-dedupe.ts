/**
 * Duplicate protection for POST /api/submit.
 *
 * A double-click, a retry after a dropped connection, or a resent form would
 * otherwise create a second hidden entry and a second verification email.
 * Each submission claims two keys in Redis:
 *   - a fingerprint of the validated form (same person, same details), and
 *   - the client's Idempotency-Key header, when it sends one.
 * If either key is already claimed, the earlier response is replayed (or, while
 * the first request is still running, the caller is told to wait).
 *
 * Only SHA-256 hashes go into Redis, never the email or form contents.
 * Without Redis, everything is allowed through (same as rate limiting).
 */

/** The subset of the Upstash Redis client this module uses. */
export interface DedupeStore {
  set(key: string, value: string, opts: { nx?: boolean; ex: number }): Promise<unknown>;
  get(key: string): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
}

/** Seconds a finished submission is remembered. */
export const DONE_TTL_SECONDS = 24 * 60 * 60;
/** Seconds an in-flight claim lives, so a crashed request can't block a retry for long. */
export const PENDING_TTL_SECONDS = 120;

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

/** Fields that change on every attempt and say nothing about the entry itself. */
const VOLATILE_FIELDS = new Set(['turnstileToken', 'honeypot']);

/** JSON with object keys sorted, so the same form always hashes the same way. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([k, v]) => v !== undefined && !VOLATILE_FIELDS.has(k))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The Redis keys for one submission: the form fingerprint, plus the client key if it's well formed. */
export async function dedupeKeys(data: unknown, idempotencyKey: string | null): Promise<string[]> {
  const keys = [`submit:fp:${await sha256Hex(stableStringify(data))}`];
  const k = idempotencyKey?.trim();
  if (k && KEY_PATTERN.test(k)) keys.push(`submit:idem:${await sha256Hex(k)}`);
  return keys;
}

type Stored = { state: 'pending' } | { state: 'done'; body: unknown };

function parseStored(raw: unknown): Stored | null {
  // Upstash parses JSON strings on read by default; accept either form.
  let v = raw;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { return null; }
  }
  const state = (v as { state?: unknown } | null)?.state;
  if (state === 'pending') return { state: 'pending' };
  if (state === 'done') return { state: 'done', body: (v as { body?: unknown }).body };
  return null;
}

export type Claim =
  | { kind: 'new'; finish(body: unknown): Promise<void>; release(): Promise<void> }
  | { kind: 'replay'; body: unknown }
  | { kind: 'in_progress' };

const noop = async () => {};

/**
 * Claim every key, or report what already holds one. On `new`, call `finish`
 * with the success body, or `release` if the submission failed so the person
 * can try again.
 */
export async function claimSubmission(store: DedupeStore | null, keys: string[]): Promise<Claim> {
  if (!store || keys.length === 0) return { kind: 'new', finish: noop, release: noop };

  const pending = JSON.stringify({ state: 'pending' });
  const claimed: string[] = [];
  try {
    for (const key of keys) {
      const ok = await store.set(key, pending, { nx: true, ex: PENDING_TTL_SECONDS });
      if (ok) { claimed.push(key); continue; }

      // Someone already holds this key: give back what we took, then report it.
      if (claimed.length) await store.del(...claimed);
      const existing = parseStored(await store.get(key));
      if (existing?.state === 'done') return { kind: 'replay', body: existing.body };
      return { kind: 'in_progress' };
    }
  } catch (e) {
    // Redis trouble shouldn't block a real submission.
    console.error('[submit-dedupe] claim failed:', e);
    if (claimed.length) await store.del(...claimed).catch(() => {});
    return { kind: 'new', finish: noop, release: noop };
  }

  return {
    kind: 'new',
    async finish(body: unknown) {
      const done = JSON.stringify({ state: 'done', body });
      try {
        await Promise.all(claimed.map((key) => store.set(key, done, { ex: DONE_TTL_SECONDS })));
      } catch (e) {
        console.error('[submit-dedupe] finish failed:', e);
      }
    },
    async release() {
      try { await store.del(...claimed); } catch (e) { console.error('[submit-dedupe] release failed:', e); }
    },
  };
}
