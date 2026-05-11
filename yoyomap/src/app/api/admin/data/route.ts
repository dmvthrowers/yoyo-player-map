import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function checkAdmin(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token') ?? '';
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!token || !expected) return false;
  const ta = Buffer.from(token);
  const tb = Buffer.from(expected);
  const len = Math.max(ta.length, tb.length);
  const a = Buffer.alloc(len);
  const b = Buffer.alloc(len);
  ta.copy(a);
  tb.copy(b);
  return crypto.timingSafeEqual(a, b) && ta.length === tb.length;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();

  // Parse query params for pagination, sorting, and search
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '100', 10), 500);
  const sort = searchParams.get('sort') || 'created_at';
  const direction = searchParams.get('direction') === 'asc' ? true : false;
  const search = searchParams.get('search')?.trim() || '';

  // Build entries query
  let entriesQuery = supabase
    .from('entries')
    .select(
      'id, display_name, email, city, region, country, age_band, entity_type, verified_owner, is_visible, is_flagged, auto_hidden_by_reports, location_status, deleted_at, created_at, verified_at, last_reminder_at, reminder_count'
    )
    .order(sort, { ascending: direction })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (search) {
    // Simple search on display_name, email, city
    entriesQuery = entriesQuery.or(
      `display_name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`
    );
  }

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
    { count: statusVerified },
    { count: statusAutoGeocoded },
    { count: statusNeedsResearch },
    { count: statusAwaitingOwner },
    { count: statusDeadPin },
  ] = await Promise.all([
    entriesQuery,
    supabase
      .from('reports')
      .select('id, entry_id, reason, details, resolved_at, created_at')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_visible', true).eq('auto_hidden_by_reports', false),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_visible', false).eq('is_flagged', false).eq('auto_hidden_by_reports', false),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_flagged', true),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('auto_hidden_by_reports', true),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('age_band', '13-17'),
    supabase.from('reports').select('*', { count: 'exact', head: true }).is('resolved_at', null),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null).or('entity_type.eq.person,entity_type.is.null'),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('entity_type', 'shop'),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('entity_type', 'club'),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('entity_type', 'shop').eq('verified_owner', true),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('location_status', 'verified'),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('location_status', 'auto_geocoded'),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('location_status', 'needs_research'),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('location_status', 'awaiting_owner_response'),
    supabase.from('entries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('location_status', 'dead_pin'),
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
    locationStatus: {
      verified: statusVerified ?? 0,
      auto_geocoded: statusAutoGeocoded ?? 0,
      needs_research: statusNeedsResearch ?? 0,
      awaiting_owner_response: statusAwaitingOwner ?? 0,
      dead_pin: statusDeadPin ?? 0,
    },
  };

  return NextResponse.json({ entries: entries ?? [], reports: reports ?? [], stats });
}
