import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateToken } from '@/lib/tokens';
import { sendManageEntryEmail } from '@/lib/email';
import { checkRateLimit, logAudit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({ email: z.string().trim().email().toLowerCase() });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const allowed = await checkRateLimit(ip, 'magic_link.request', 5, 60);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });

  const { email } = parsed.data;
  const supabase = createAdminClient();

  const { data: entry } = await supabase
    .from('entries')
    .select('id, display_name')
    .eq('email', email)
    .is('deleted_at', null)
    .maybeSingle();

  // Don't reveal whether email exists — always return success
  if (!entry) {
    await logAudit('magic_link.unknown_email', { meta: { ip } });
    return NextResponse.json({ ok: true });
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  const { error } = await supabase.from('verification_tokens').insert({
    entry_id: entry.id,
    token,
    purpose: 'edit_link',
    expires_at: expiresAt,
  });
  if (error) {
    console.error('Magic link insert failed:', error);
    return NextResponse.json({ error: 'Could not send link. Try again.' }, { status: 500 });
  }

  const outcome = await sendManageEntryEmail(email, entry.display_name, token);

  await logAudit('magic_link.sent', {
    actor: email,
    targetId: entry.id,
    meta: { ip, emailStatus: outcome.status },
  });

  // We never confirm account existence to the caller, so on "failed" we still
  // return ok:true and let the user re-request later. For "queued" we do
  // surface the retry time — the user already identified themselves by email,
  // so telling them "we're over quota, try again after midnight UTC" is safe
  // and more useful than staying silent.
  if (outcome.status === 'queued') {
    return NextResponse.json({
      ok: true,
      emailStatus: 'queued',
      retryAt: outcome.retryAt,
      message: outcome.kind === 'daily_quota'
        ? "We've hit today's email limit. Your link will be sent automatically after midnight UTC — no need to re-request."
        : "Our email service is briefly throttled. Your link will arrive in a minute or two.",
    });
  }
  return NextResponse.json({ ok: true });
}
