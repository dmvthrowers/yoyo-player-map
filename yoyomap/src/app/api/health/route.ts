import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Uptime probe. The default check only proves the app is serving, so
 * scanners and crawlers can't burn Supabase quota. `?deep=1` also reads one
 * row from Supabase, and requires HEALTHCHECK_TOKEN via the
 * `x-healthcheck-token` header or `?token=`.
 */
function isAuthorizedHealthProbe(req: NextRequest): boolean {
  const token = process.env.HEALTHCHECK_TOKEN;
  if (!token) return false;
  const headerToken = req.headers.get('x-healthcheck-token');
  const queryToken = req.nextUrl.searchParams.get('token');
  return headerToken === token || queryToken === token;
}

export async function GET(req: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  const deep = req.nextUrl.searchParams.get('deep') === '1';

  if (!deep || !isAuthorizedHealthProbe(req)) {
    return NextResponse.json({ ok: true, db: 'skipped', ts: new Date().toISOString() }, { headers });
  }

  try {
    const { error } = await createAdminClient().from('entries').select('id').limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, db: 'connected', ts: new Date().toISOString() }, { headers });
  } catch (e) {
    console.error('[health] deep check failed:', e);
    return NextResponse.json({ ok: false, db: 'error' }, { status: 503, headers });
  }
}
