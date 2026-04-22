import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Lazy-loaded popup detail. The /map page ships a lean entry list; clicking a
// pin triggers a fetch here. We cache aggressively at the CDN (s-maxage=3600)
// so repeat popups across users are served from Vercel's edge, not Supabase.
//
// Returned shape mirrors MapEntryDetail in app/map/page.tsx.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('map_entries')
      .select('id, bio, socials, address_line, postal_code, hours, club_meeting_info, club_venue_public')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Entry detail fetch error:', error);
      return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    return NextResponse.json(data, {
      headers: {
        // Edge cache for 1 hour, allow stale-while-revalidate for another hour.
        // Entry content changes rarely; this keeps popup opens off Supabase.
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
      },
    });
  } catch (e) {
    console.error('Entry detail handler error:', e);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
