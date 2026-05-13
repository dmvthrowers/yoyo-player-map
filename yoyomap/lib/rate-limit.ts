
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createAdminClient } from './supabase/admin';

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Cache Ratelimit instances by key so they're not reconstructed on every call.
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(action: string, max: number, windowMinutes: number): Ratelimit | null {
  if (!redis) return null;
  const key = `${action}:${max}:${windowMinutes}`;
  if (!limiterCache.has(key)) {
    limiterCache.set(key, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, `${windowMinutes} m`),
      prefix: `rl:${action}`,
    }));
  }
  return limiterCache.get(key)!;
}

export async function checkRateLimit(
  ip: string,
  action: string,
  max: number,
  windowMinutes: number
): Promise<boolean> {
  const limiter = getLimiter(action, max, windowMinutes);
  if (!limiter) {
    console.warn('[rate-limit] Redis not configured — skipping rate limit for', action);
    return true;
  }
  try {
    const { success } = await limiter.limit(ip);
    return success;
  } catch (error) {
    console.error('[rate-limit] check failed:', error);
    return true;
  }
}


// Only use audit_log for COPPA/consent/parental events
export async function logAudit(
  action: string,
  opts: { actor?: string; targetId?: string; meta?: Record<string, unknown> } = {}
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('audit_log').insert({
    action,
    actor: opts.actor ?? 'system',
    target_id: opts.targetId ?? null,
    meta: opts.meta ?? {},
  });
  if (error) console.error('[logAudit] insert failed:', action, error.message);
}

export function getClientIp(headers: Headers): string {
  // x-real-ip is set by Vercel's edge network and is not client-spoofable.
  // x-forwarded-for is the fallback; the first entry is the client IP on Vercel.
  return (
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}
