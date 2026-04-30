import { admin } from './supabase/admin';

export async function checkRateLimit(ip: string, action: string) {
  const now = new Date().toISOString();
  const { count } = await admin.from('audit_log').select('*', { count: 'exact', head: true })
    .eq('ip', ip).eq('action', action).gte('created_at', new Date(Date.now() - 60 * 1000).toISOString());
  if ((count ?? 0) >= 1) throw new Error('Rate limit exceeded');
  await admin.from('audit_log').insert({ ip, action, created_at: now });
}
