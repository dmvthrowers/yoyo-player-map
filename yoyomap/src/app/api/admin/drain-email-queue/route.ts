import { NextRequest, NextResponse } from 'next/server';
import { drainEmailQueue } from '@/lib/email';
import { logAudit, getClientIp } from '@/lib/rate-limit';
import { requireAdminOrCron } from '@/lib/admin-auth';

export const runtime = 'nodejs';
// Sends are paced at 2/second; the drain stops starting new ones after 40s.
export const maxDuration = 60;

/**
 * Drain queued emails that were deferred because Resend returned 429 (daily
 * quota or per-second throttle). Accepts:
 *   - Admin UI button: header `x-admin-token: $ADMIN_PASSWORD`
 *   - Vercel cron:     header `Authorization: Bearer $CRON_SECRET`
 *
 * Supabase pg_cron (v34) calls this every 5 minutes, but only while rows are
 * due, and the Vercel cron runs it once just after the 00:00 UTC reset.
 */

async function handle(req: NextRequest) {
  const authError = await requireAdminOrCron(req);
  if (authError) return authError;

  const summary = await drainEmailQueue(60);
  await logAudit('admin.drain_email_queue', {
    actor: 'admin',
    meta: { ip: getClientIp(req.headers), ...summary },
  });

  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
