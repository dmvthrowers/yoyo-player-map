import { NextRequest, NextResponse } from 'next/server';
import { drainEmailQueue } from '@/lib/email';
import { logAudit, getClientIp } from '@/lib/rate-limit';
import { requireAdminOrCron } from '@/lib/admin-auth';

export const runtime = 'nodejs';

/**
 * Drain queued emails that were deferred because Resend returned 429 (daily
 * quota or per-second throttle). Accepts:
 *   - Admin UI button: header `x-admin-token: $ADMIN_PASSWORD`
 *   - Vercel cron:     header `Authorization: Bearer $CRON_SECRET`
 *
 * Schedule this to run shortly after 00:00 UTC (to pick up daily-quota
 * rows) and every ~5 minutes (to pick up per-second throttle rows).
 */

async function handle(req: NextRequest) {
  const authError = await requireAdminOrCron(req);
  if (authError) return authError;

  const summary = await drainEmailQueue(100);
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
