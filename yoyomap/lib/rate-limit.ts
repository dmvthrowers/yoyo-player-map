
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createAdminClient } from './supabase/admin';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache Ratelimit instances by key so they're not reconstructed on every call.
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(action: string, max: number, windowMinutes: number): Ratelimit {
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
  try {
    const { success } = await getLimiter(action, max, windowMinutes).limit(ip);
    return success;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true;
  }
}


// Only use audit_log for COPPA/consent/parental events
export async function logAudit(
  action: string,
  opts: { actor?: string; targetId?: string; meta?: Record<string, unknown> } = {}
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('audit_log').insert({
    action,
    actor: opts.actor ?? 'system',
    target_id: opts.targetId ?? null,
    meta: opts.meta ?? {},
  });
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
