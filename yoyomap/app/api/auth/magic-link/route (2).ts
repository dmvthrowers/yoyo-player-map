import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateToken } from '@/lib/tokens';
import { sendManageEntryEmail, sendManageEntriesEmail } from '@/lib/email';
import { checkRateLimit, logAudit, getClientIp } from '@/lib/rate-limit';
import { apiError, withErrorHandling } from '@/lib/api-error';

export const runtime = 'edge';
export const preferredRegion = 'iad1';

const schema = z.object({ email: z.string().trim().email().toLowerCase() });

export const POST = withErrorHandling(async (requestId: string, req: NextRequest) => {
  const ip = getClientIp(req.headers);
  const allowed = await checkRateLimit(ip, 'magic_link.request', 5, 60);
  if (!allowed) {
    return apiError('rate_limited', 'Too many requests. Try again later.', requestId);
  }

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('bad_request', 'Invalid body.', requestId); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError('bad_request', 'Invalid email.', requestId);

  const { email } = parsed.data;
  const supabase = createAdminClient();

  const { data: entries } = await supabase
    .from('entries')
    .select('id, display_name, entity_type')
    .eq('email', email)
    .is('deleted_at', null);

  // Don't reveal whether email exists — always return success
  if (!entries || entries.length === 0) {
    await logAudit('magic_link.unknown_email', { meta: { ip } });
    return NextResponse.json({ ok: true, requestId }, { headers: { 'x-request-id': requestId } });
  }

  const tokens = entries.map(() => generateToken());
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  const inserts = entries.map((entry, index) => ({
    entry_id: entry.id,
    token: tokens[index],
    purpose: 'edit_link',
    expires_at: expiresAt,
  }));

  const { error } = await supabase.from('verification_tokens').insert(inserts);
  if (error) {
    console.error(`[api] magic link insert failed [${requestId}]:`, error);
    return apiError('upstream_error', 'Could not send link. Try again.', requestId);
  }

  const outcome = entries.length === 1
    ? await sendManageEntryEmail(email, entries[0].display_name, tokens[0])
    : await sendManageEntriesEmail(email, entries.map((entry, index) => ({
        displayName: entry.display_name,
        token: tokens[index],
        entityType: entry.entity_type as 'person' | 'shop' | 'club',
      })));

  await logAudit('magic_link.sent', {
    actor: email,
    targetId: entries.length === 1 ? entries[0].id : undefined,
    meta: {
      ip,
      emailStatus: outcome.status,
      targetIds: entries.length > 1 ? entries.map((entry) => entry.id) : undefined,
    },
  });

  // We never confirm account existence to the caller, so on "failed" we still
  // return ok:true and let the user re-request later. For "queued" we do
  // surface the retry time — the user already identified themselves by email,
  // so telling them "we're over quota, try again after midnight UTC" is safe
  // and more useful than staying silent.
  if (outcome.status === 'queued') {
    return NextResponse.json({
      ok: true,
      requestId,
      emailStatus: 'queued',
      retryAt: outcome.retryAt,
      message: outcome.kind === 'daily_quota'
        ? "We've hit today's email limit. Your link will be sent automatically after midnight UTC — no need to re-request."
        : "Our email service is briefly throttled. Your link will arrive in a minute or two.",
    }, { headers: { 'x-request-id': requestId } });
  }
  return NextResponse.json({ ok: true, requestId }, { headers: { 'x-request-id': requestId } });
});
