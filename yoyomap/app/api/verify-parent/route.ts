import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, logAudit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');
  const token = req.nextUrl.searchParams.get('token');
  const ip = getClientIp(req.headers);

  if (!token || !type) {
    return redirectTo(req, '/legal/privacy', { error: 'missing_token' });
  }

  const allowed = await checkRateLimit(ip, 'verify_parent.attempt', 20, 60);
  if (!allowed) {
    return redirectTo(req, '/', { error: 'rate_limited' });
  }
  await logAudit('verify_parent.attempt', { meta: { ip, type } });

  const supabase = createAdminClient();

  if (type === 'entry') {
    return await verifyEntry(req, supabase, token, ip);
  } else if (type === 'consent') {
    return await verifyConsent(req, supabase, token, ip, req.headers.get('user-agent') || '');
  } else {
    return redirectTo(req, '/', { error: 'invalid_type' });
  }
}

async function verifyEntry(
  req: NextRequest,
  supabase: ReturnType<typeof createAdminClient>,
  token: string,
  ip: string
) {
  const { data: tok, error } = await supabase
    .from('verification_tokens')
    .select('*, entries(*)')
    .eq('token', token)
    .eq('purpose', 'email_verify')
    .maybeSingle();

  if (error || !tok) {
    return redirectTo(req, '/', { error: 'invalid_token' });
  }
  if (tok.used_at) {
    return redirectTo(req, '/', { error: 'token_used' });
  }
  if (new Date(tok.expires_at) < new Date()) {
    return redirectTo(req, '/', { error: 'token_expired' });
  }

  // Mark token used
  await supabase.from('verification_tokens').update({ used_at: new Date().toISOString() }).eq('id', tok.id);

  // Verify the entry
  const entry = tok.entries as { id: string; age_band: string; parent_consent_id: string | null };
  await supabase.from('entries').update({ verified_at: new Date().toISOString() }).eq('id', entry.id);

  // If adult, publish immediately. If minor, only publish if parent consent is already granted.
  const canPublish = await checkCanPublish(supabase, entry);
  if (canPublish) {
    await supabase.from('entries').update({ is_visible: true }).eq('id', entry.id);
    await logAudit('entry.published', { targetId: entry.id, meta: { ip, reason: 'email_verified' } });
    return redirectTo(req, '/map', { verified: '1' });
  }

  await logAudit('entry.verified_pending_consent', { targetId: entry.id, meta: { ip } });
  return redirectTo(req, '/', { verified: '1', pending: 'parent' });
}

async function verifyConsent(
  req: NextRequest,
  supabase: ReturnType<typeof createAdminClient>,
  token: string,
  ip: string,
  userAgent: string
) {
  const { data: consent, error } = await supabase
    .from('parent_consents')
    .select('*')
    .eq('consent_token', token)
    .maybeSingle();

  if (error || !consent) {
    return redirectTo(req, '/', { error: 'invalid_consent' });
  }
  if (consent.consented_at) {
    return redirectTo(req, '/', { consent: 'already_granted' });
  }
  if (consent.revoked_at) {
    return redirectTo(req, '/', { error: 'consent_revoked' });
  }
  // 7-day expiry on consent links
  const created = new Date(consent.created_at).getTime();
  if (Date.now() - created > 7 * 24 * 60 * 60 * 1000) {
    return redirectTo(req, '/', { error: 'consent_expired' });
  }

  // Record consent with audit trail
  await supabase
    .from('parent_consents')
    .update({
      consented_at: new Date().toISOString(),
      consent_ip: ip !== 'unknown' ? ip : null,
      consent_user_agent: userAgent || null,
    })
    .eq('id', consent.id);

  // Find the entry linked to this consent
  const { data: entry } = await supabase
    .from('entries')
    .select('id, verified_at')
    .eq('parent_consent_id', consent.id)
    .maybeSingle();

  if (entry) {
    // Publish if the minor's own email is also verified
    if (entry.verified_at) {
      await supabase.from('entries').update({ is_visible: true }).eq('id', entry.id);
      await logAudit('entry.published', { targetId: entry.id, meta: { ip, reason: 'consent_granted' } });
    }
  }

  await logAudit('consent.granted', {
    actor: consent.parent_email,
    targetId: consent.id,
    meta: { ip, userAgent },
  });

  return redirectTo(req, '/', { consent: 'granted' });
}

async function checkCanPublish(
  supabase: ReturnType<typeof createAdminClient>,
  entry: { age_band: string; parent_consent_id: string | null }
): Promise<boolean> {
  if (entry.age_band === '18+') return true;
  if (!entry.parent_consent_id) return false;
  const { data: consent } = await supabase
    .from('parent_consents')
    .select('consented_at, revoked_at')
    .eq('id', entry.parent_consent_id)
    .maybeSingle();
  return !!(consent?.consented_at && !consent?.revoked_at);
}

function redirectTo(req: NextRequest, path: string, params: Record<string, string>): NextResponse {
  const url = new URL(path, req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}
