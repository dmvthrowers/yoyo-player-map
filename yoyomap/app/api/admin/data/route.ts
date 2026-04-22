import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function checkAdmin(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token') ?? '';
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!token || !expected) return false;
  const a = crypto.createHash('sha256').update(token).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
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
    visible: e.filter((x) => x.is_visible && !x.deleted_at && !x.auto_hidden_by_reports).length,
    pending: e.filter((x) => !x.is_visible && !x.deleted_at && !x.is_flagged && !x.auto_hidden_by_reports).length,
    flagged: e.filter((x) => x.is_flagged && !x.deleted_at).length,
    autoHidden: e.filter((x) => x.auto_hidden_by_reports && !x.deleted_at).length,
    minors: e.filter((x) => x.age_band === '13-17' && !x.deleted_at).length,
    openReports: (reports || []).length,
    // Entity type breakdown
    byType: {
      person: e.filter((x) => (x.entity_type === 'person' || !x.entity_type) && !x.deleted_at).length,
      shop: e.filter((x) => x.entity_type === 'shop' && !x.deleted_at).length,
      club: e.filter((x) => x.entity_type === 'club' && !x.deleted_at).length,
    },
    // Verified owners (shops only)
    verifiedOwners: e.filter((x) => x.entity_type === 'shop' && x.verified_owner && !x.deleted_at).length,
  };

  return NextResponse.json({ entries: e, reports: reports || [], stats });
}
