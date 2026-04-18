import { createAdminClient } from './supabase/admin';

/**
 * Simple IP-based rate limit using the audit_log table.
 * Returns true if the action is allowed, false if rate-limited.
 */
export async function checkRateLimit(
  ip: string,
  action: string,
  max: number,
  windowMinutes: number
): Promise<boolean> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('action', action)
    .gte('at', since)
    .filter('meta->>ip', 'eq', ip);

  if (error) {
    console.error('Rate limit check failed:', error);
    // Fail open — don't block legitimate users if the check errors
    return true;
  }
  return (count ?? 0) < max;
}

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
