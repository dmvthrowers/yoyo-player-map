import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function checkAdmin(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token');
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return !!token && token === expected;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const [{ data: entries }, { data: reports }] = await Promise.all([
    supabase.from('entries').select('*').order('created_at', { ascending: false }),
    supabase.from('reports').select('*').is('resolved_at', null).order('created_at', { ascending: false }),
  ]);

  const e = entries || [];
  const stats = {
    total: e.length,
    visible: e.filter((x) => x.is_visible && !x.deleted_at).length,
    pending: e.filter((x) => !x.is_visible && !x.deleted_at && !x.is_flagged).length,
    flagged: e.filter((x) => x.is_flagged && !x.deleted_at).length,
    minors: e.filter((x) => x.age_band === '13-17' && !x.deleted_at).length,
    openReports: (reports || []).length,
  };

  return NextResponse.json({ entries: e, reports: reports || [], stats });
}
