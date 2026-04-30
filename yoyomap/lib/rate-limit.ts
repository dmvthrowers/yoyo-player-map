
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { createAdminClient } from './supabase/admin';


/**
 * Edge-compatible IP-based rate limit using Upstash/Vercel KV.
 * Returns true if the action is allowed, false if rate-limited.
 */
export async function checkRateLimit(
  ip: string,
  action: string,
  max: number,
  windowMinutes: number
): Promise<boolean> {
  // Use a unique key per action and IP
  const limiter = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(max, `${windowMinutes} m`),
    prefix: `rl:${action}`,
  });
  try {
    const { success } = await limiter.limit(ip);
    return success;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open — don't block legitimate users if the check errors
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
