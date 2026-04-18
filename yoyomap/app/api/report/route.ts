import { NextRequest, NextResponse } from 'next/server';
import { reportSchema } from '@/lib/validation';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, logAudit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  // Rate limit: 10 reports per IP per hour
  const allowed = await checkRateLimit(ip, 'report.submit', 10, 60);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many reports. Try again later.' }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid report' }, { status: 400 });

  const { entryId, reason, details, reporterEmail } = parsed.data;
  const supabase = createAdminClient();

  // Verify entry exists
  const { data: entry } = await supabase.from('entries').select('id').eq('id', entryId).maybeSingle();
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

  const { error } = await supabase.from('reports').insert({
    entry_id: entryId,
    reason,
    details: details || null,
    reporter_email: reporterEmail || null,
    reporter_ip: ip !== 'unknown' ? ip : null,
  });

  if (error) {
    console.error('Report insert failed:', error);
    return NextResponse.json({ error: 'Could not submit report.' }, { status: 500 });
  }

  // Auto-hide on safety-related reports pending review
  if (reason === 'minor_unsafe' || reason === 'harassment') {
    await supabase.from('entries').update({ is_flagged: true, is_visible: false, flagged_reason: reason }).eq('id', entryId);
    await logAudit('entry.auto_hidden', { targetId: entryId, meta: { ip, reason } });
  }

  await logAudit('report.submitted', { actor: reporterEmail || 'anon', targetId: entryId, meta: { ip, reason } });
  return NextResponse.json({ ok: true });
}
