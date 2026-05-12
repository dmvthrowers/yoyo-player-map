import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Daily cron (10:00 UTC) — sends verification reminders to unverified entries.
// Vercel injects Authorization: Bearer $CRON_SECRET automatically.
export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/admin/send-reminders`, {
    method: 'GET',
    headers: { authorization: `Bearer ${cronSecret}` },
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json({ ok: res.ok, status: res.status, ...body });
}
