import { NextRequest, NextResponse } from 'next/server';
import { drainEmailQueue } from '@/lib/email';
import { logAudit, getClientIp } from '@/lib/rate-limit';
import { requireAdminOrCron } from '@/lib/admin-auth';
import { isSignedByQstash } from '@/lib/qstash';
import { heartbeat } from '@/lib/heartbeat';
import { withErrorHandling } from '@/lib/api-error';

export const runtime = 'nodejs';
// Sends are paced at 2/second; the drain stops starting new ones after 40s.
export const maxDuration = 60;

/**
 * Drain queued emails that were deferred because Resend returned 429 (daily
 * quota or per-second throttle). Accepts:
 *   - Admin UI button: header `x-admin-token: $ADMIN_PASSWORD`
 *   - Vercel cron:     header `Authorization: Bearer $CRON_SECRET`
 *   - QStash schedule: `Upstash-Signature` (backstop if pg_cron stops)
 *
 * Supabase pg_cron (v34) calls this every 5 minutes, but only while rows are
 * due, and the Vercel cron runs it once just after the 00:00 UTC reset.
 */

async function handle(requestId: string, req: NextRequest) {
  const viaQstash = await isSignedByQstash(req);
  if (!viaQstash) {
    const authError = await requireAdminOrCron(req, requestId);
    if (authError) return authError;
  }

  let summary;
  try {
    summary = await drainEmailQueue(60);
  } catch (e) {
    await heartbeat('map-drain-email', 'fail');
    throw e;
  }
  await heartbeat('map-drain-email', summary.claimFailed ? 'fail' : 'ok');
  await logAudit('admin.drain_email_queue', {
    actor: viaQstash ? 'qstash' : 'admin',
    meta: { ip: getClientIp(req.headers), ...summary },
  });

  return NextResponse.json({ ok: true, ...summary });
}

export const GET = withErrorHandling(handle);

export const POST = withErrorHandling(handle);
