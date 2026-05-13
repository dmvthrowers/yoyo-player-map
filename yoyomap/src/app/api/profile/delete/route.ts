import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit, getClientIp, checkRateLimit } from '@/lib/rate-limit';
import { hashToken } from '@/lib/tokens';
import { apiError, withErrorHandling, bodyTooLarge } from '@/lib/api-error';
import { revalidateEntryLocations } from '@/lib/revalidate';

export const runtime = 'nodejs';

const schema = z.object({ token: z.string().min(1) });

export const POST = withErrorHandling(async (requestId: string, req: NextRequest) => {
  const ip = getClientIp(req.headers);
  const allowed = await checkRateLimit(ip, 'profile.delete', 5, 60);
  if (!allowed) return apiError('rate_limited', 'Too many requests. Try again later.', requestId);

  let body: unknown;
  if (bodyTooLarge(req, 1024)) {
    return apiError('bad_request', 'Request body too large.', requestId);
  }
  try { body = await req.json(); } catch { return apiError('bad_request', 'Invalid body.', requestId); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError('bad_request', 'Invalid input.', requestId);

  const tokenHash = await hashToken(parsed.data.token);
  const supabase = createAdminClient();
  const { data: tok } = await supabase
    .from('verification_tokens')
    .select('entry_id, expires_at, purpose, used_at')
    .eq('token', tokenHash)
    .maybeSingle();

  if (!tok || tok.purpose !== 'edit_link' || tok.used_at || new Date(tok.expires_at) < new Date()) {
    return apiError('unauthorized', 'Link invalid or expired.', requestId);
  }

  const { data: entry } = await supabase
    .from('entries')
    .select('id, parent_consent_id, email, country, region, city')
    .eq('id', tok.entry_id)
    .maybeSingle();
  if (!entry) return apiError('not_found', 'Entry not found.', requestId);

  // Hard delete — GDPR right to erasure.
  // Cascade: verification_tokens FK onto entries is ON DELETE CASCADE.
  // Parent consents use ON DELETE RESTRICT, so we delete the entry first,
  // then the consent.
  const { error: delEntryErr } = await supabase.from('entries').delete().eq('id', entry.id);
  if (delEntryErr) {
    console.error(`[api] delete entry failed [${requestId}]:`, delEntryErr);
    return apiError('upstream_error', 'Delete failed.', requestId);
  }
  if (entry.parent_consent_id) {
    await supabase.from('parent_consents').delete().eq('id', entry.parent_consent_id);
  }

  await logAudit('entry.deleted', { actor: entry.email, targetId: entry.id, meta: { ip, type: 'self' } });
  revalidateEntryLocations({ country: entry.country, region: entry.region, city: entry.city });
  return NextResponse.json({ ok: true, requestId }, { headers: { 'x-request-id': requestId } });
});
