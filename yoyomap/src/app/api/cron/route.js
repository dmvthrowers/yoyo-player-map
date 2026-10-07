import { NextResponse } from 'next/server';
import { heartbeat } from '@/lib/heartbeat';
import { apiError, withErrorHandling } from '@/lib/api-error';

export const runtime = 'nodejs';

// Daily cron (10:00 UTC) — sends verification reminders to unverified entries.
// Vercel injects Authorization: Bearer $CRON_SECRET automatically.
export const GET = withErrorHandling(async (requestId, req) => {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiError('unauthorized', 'Unauthorized', requestId);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  let res;
  try {
    res = await fetch(`${baseUrl}/api/admin/send-reminders`, {
      method: 'GET',
      headers: { authorization: `Bearer ${cronSecret}` },
    });
  } catch (e) {
    await heartbeat('map-reminders', 'fail');
    throw e;
  }

  const body = await res.json().catch(() => ({}));
  await heartbeat('map-reminders', res.ok ? 'ok' : 'fail');
  return NextResponse.json({ ok: res.ok, status: res.status, ...body });
});
