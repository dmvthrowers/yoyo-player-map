import 'server-only';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from './rate-limit';

// 30 requests per 15 minutes per IP — generous for a human admin session
// but harsh enough to block automated brute-force attacks.
const ADMIN_RATE_LIMIT_MAX = 30;
const ADMIN_RATE_LIMIT_WINDOW_MINUTES = 15;

function timingSafeEq(a: string, b: string): boolean {
  const ta = Buffer.from(a);
  const tb = Buffer.from(b);
  const len = Math.max(ta.length, tb.length);
  const pa = Buffer.alloc(len);
  const pb = Buffer.alloc(len);
  ta.copy(pa);
  tb.copy(pb);
  return crypto.timingSafeEqual(pa, pb) && ta.length === tb.length;
}

/**
 * Rate-limit + verify admin token. Returns a 429/401 NextResponse on
 * failure, null on success. Use for admin-only routes.
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIp(req.headers);
  const allowed = await checkRateLimit(ip, 'admin.access', ADMIN_RATE_LIMIT_MAX, ADMIN_RATE_LIMIT_WINDOW_MINUTES);
  if (!allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  const token = req.headers.get('x-admin-token') ?? '';
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!token || !expected || !timingSafeEq(token, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * Rate-limit + verify admin token OR Vercel cron secret. Returns a 429/401
 * NextResponse on failure, null on success. Use for routes that accept both
 * admin UI requests and Vercel cron calls.
 */
export async function requireAdminOrCron(req: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIp(req.headers);
  const allowed = await checkRateLimit(ip, 'admin.access', ADMIN_RATE_LIMIT_MAX, ADMIN_RATE_LIMIT_WINDOW_MINUTES);
  if (!allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  const adminExpected = process.env.ADMIN_PASSWORD ?? '';
  const cronExpected = process.env.CRON_SECRET ?? '';

  const adminToken = req.headers.get('x-admin-token') ?? '';
  if (adminToken && adminExpected && timingSafeEq(adminToken, adminExpected)) return null;

  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (bearer && cronExpected && timingSafeEq(bearer, cronExpected)) return null;

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
