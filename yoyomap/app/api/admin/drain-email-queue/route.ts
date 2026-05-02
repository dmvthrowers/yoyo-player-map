import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { drainEmailQueue } from '@/lib/email';
import { logAudit, getClientIp } from '@/lib/rate-limit';

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
function checkAuth(req: NextRequest): boolean {
  const adminExpected = process.env.ADMIN_PASSWORD ?? '';
  const cronExpected = process.env.CRON_SECRET ?? '';

  const adminToken = req.headers.get('x-admin-token') ?? '';
  if (adminToken && adminExpected && safeEq(adminToken, adminExpected)) return true;

  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (bearer && cronExpected && safeEq(bearer, cronExpected)) return true;

  return false;
}

function safeEq(a: string, b: string): boolean {
  const ta = Buffer.from(a);
  const tb = Buffer.from(b);
  const len = Math.max(ta.length, tb.length);
  const pa = Buffer.alloc(len);
  const pb = Buffer.alloc(len);
  ta.copy(pa);
  tb.copy(pb);
  return crypto.timingSafeEqual(pa, pb) && ta.length === tb.length;
}

async function handle(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
