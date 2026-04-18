import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

  const supabase = createAdminClient();
  const { data: tok } = await supabase
    .from('verification_tokens')
    .select('entry_id, expires_at, purpose, used_at')
    .eq('token', parsed.data.token)
    .maybeSingle();

  if (!tok || tok.purpose !== 'edit_link' || tok.used_at || new Date(tok.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Link invalid or expired.' }, { status: 401 });
  }

  const { data: entry } = await supabase
    .from('entries')
    .select('id, parent_consent_id, email')
    .eq('id', tok.entry_id)
    .maybeSingle();
  if (!entry) return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });

  // Hard delete — GDPR right to erasure.
  // Cascade: verification_tokens FK onto entries is ON DELETE CASCADE.
  // Parent consents use ON DELETE RESTRICT, so we delete the entry first,
  // then the consent.
  const { error: delEntryErr } = await supabase.from('entries').delete().eq('id', entry.id);
  if (delEntryErr) {
    console.error('Delete entry failed:', delEntryErr);
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
  }
  if (entry.parent_consent_id) {
    await supabase.from('parent_consents').delete().eq('id', entry.parent_consent_id);
  }

  // Mark token used
  await supabase.from('verification_tokens').update({ used_at: new Date().toISOString() }).eq('token', parsed.data.token);

  await logAudit('entry.deleted', { actor: entry.email, targetId: entry.id, meta: { ip, type: 'self' } });
  return NextResponse.json({ ok: true });
}
