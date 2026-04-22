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

  const countActive = () => supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null);
  const countReports = () => supabase.from('reports').select('*', { count: 'exact', head: true }).is('resolved_at', null);

  const [
    { data: entries },
    { data: reports },
    { count: total },
    { count: visible },
    { count: pending },
    { count: flagged },
    { count: autoHidden },
    { count: minors },
    { count: openReports },
    { count: personCount },
    { count: shopCount },
    { count: clubCount },
    { count: verifiedOwners },
  ] = await Promise.all([
    supabase
      .from('entries')
      .select(
        'id, display_name, email, city, region, country, age_band, entity_type, verified_owner, is_visible, is_flagged, auto_hidden_by_reports, deleted_at, created_at, verified_at, last_reminder_at, reminder_count'
      )
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('reports')
      .select('id, entry_id, reason, details, resolved_at, created_at')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(200),
    countActive(),
    countActive().eq('is_visible', true).eq('auto_hidden_by_reports', false),
    countActive().eq('is_visible', false).eq('is_flagged', false).eq('auto_hidden_by_reports', false),
    countActive().eq('is_flagged', true),
    countActive().eq('auto_hidden_by_reports', true),
    countActive().eq('age_band', '13-17'),
    countReports(),
    countActive().or('entity_type.eq.person,entity_type.is.null'),
    countActive().eq('entity_type', 'shop'),
    countActive().eq('entity_type', 'club'),
    countActive().eq('entity_type', 'shop').eq('verified_owner', true),
  ]);

  const stats = {
    total: total ?? 0,
    visible: visible ?? 0,
    pending: pending ?? 0,
    flagged: flagged ?? 0,
    autoHidden: autoHidden ?? 0,
    minors: minors ?? 0,
    openReports: openReports ?? 0,
    byType: {
      person: personCount ?? 0,
      shop: shopCount ?? 0,
      club: clubCount ?? 0,
    },
    verifiedOwners: verifiedOwners ?? 0,
  };

  return NextResponse.json({ entries: entries ?? [], reports: reports ?? [], stats });
}
