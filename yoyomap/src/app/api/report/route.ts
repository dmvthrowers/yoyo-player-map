import { NextRequest, NextResponse } from 'next/server';
import { reportSchema, AUTO_HIDE_REASONS } from '@/lib/validation';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, logAudit, getClientIp } from '@/lib/rate-limit';
import { sendReportNotificationEmail } from '@/lib/email';
import { apiError, withErrorHandling } from '@/lib/api-error';

export const runtime = 'edge';
export const preferredRegion = 'iad1';

export const POST = withErrorHandling(async (requestId: string, req: NextRequest) => {
  const ip = getClientIp(req.headers);

  // Rate limit: 10 reports per IP per hour
  const allowed = await checkRateLimit(ip, 'report.submit', 10, 60);
  if (!allowed) {
    return apiError('rate_limited', 'Too many reports. Try again later.', requestId);
  }

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('bad_request', 'Invalid body.', requestId); }
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return apiError('bad_request', 'Invalid report.', requestId);

  const { entryId, reason, details, reporterEmail } = parsed.data;
  const supabase = createAdminClient();

  // Verify entry exists
  const { data: entry } = await supabase.from('entries').select('id, display_name, entity_type').eq('id', entryId).maybeSingle();
  if (!entry) return apiError('not_found', 'Entry not found.', requestId);

  const { error } = await supabase.from('reports').insert({
    entry_id: entryId,
    reason,
    details: details || null,
    reporter_email: reporterEmail || null,
    reporter_ip: ip !== 'unknown' ? ip : null,
  });

  if (error) {
    console.error(`[api] report insert failed [${requestId}]:`, error);
    return apiError('upstream_error', 'Could not submit report.', requestId);
  }

  // Auto-hide logic: certain report reasons trigger automatic hiding
  // 1. Safety-related reports (existing): minor_unsafe, harassment -> set is_flagged
  // 2. Business/identity reports (new): impersonation, fake_business, unauthorized_listing -> set auto_hidden_by_reports
  
  if (reason === 'minor_unsafe' || reason === 'harassment') {
    // Existing behavior: flag and hide immediately for safety review
    await supabase.from('entries').update({ 
      is_flagged: true, 
      is_visible: false, 
      flagged_reason: reason 
    }).eq('id', entryId);
    await logAudit('entry.flagged', { targetId: entryId, meta: { ip, reason } });
    // On-demand revalidate map and player pages
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/revalidate-map`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.REVALIDATE_SECRET}` } });
    } catch (e) {}
  } else if (AUTO_HIDE_REASONS.includes(reason as typeof AUTO_HIDE_REASONS[number])) {
    // New behavior: auto-hide for business/identity issues (reversible by admin)
    // Only for shops and clubs - people can't have fake_business or unauthorized_listing
    await supabase.from('entries').update({
      auto_hidden_by_reports: true 
    }).eq('id', entryId);
    await logAudit('entry.auto_hidden', { targetId: entryId, meta: { ip, reason, entityType: entry.entity_type } });
    // On-demand revalidate map and player pages
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/revalidate-map`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.REVALIDATE_SECRET}` } });
    } catch (e) {}
  }

  await logAudit('report.submitted', { actor: reporterEmail || 'anon', targetId: entryId, meta: { ip, reason } });

  // Admin-only notification — the reporter doesn't see this status, but we log
  // it so the queue-drain job picks up any rate-limited sends after reset.
  const outcome = await sendReportNotificationEmail(entryId, reason, details || null, reporterEmail || null, entry.display_name);
  if (outcome.status !== 'sent') {
    console.warn(`[api] report notification email [${requestId}]:`, outcome.status, outcome);
  }

  return NextResponse.json({ ok: true, requestId }, { headers: { 'x-request-id': requestId } });
});
