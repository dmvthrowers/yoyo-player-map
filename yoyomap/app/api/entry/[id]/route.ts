import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiError, newRequestId } from '@/lib/api-error';

// Lazy-loaded popup detail. The /map page ships a lean entry list; clicking a
// pin triggers a fetch here. We cache aggressively at the CDN (s-maxage=3600)
// so repeat popups across users are served from Vercel's edge, not Supabase.
//
// Returned shape mirrors MapEntryDetail in app/map/page.tsx.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Not wrapped in withErrorHandling: Next 15's route type validator needs to
// see the params Promise in the exported function signature directly.
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  try {
    const { id } = await context.params;
    if (!UUID_RE.test(id)) {
      return apiError('bad_request', 'Invalid entry id.', requestId);
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('map_entries')
      .select('id, bio, socials, address_line, postal_code, hours, club_meeting_info, club_venue_public')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[api] entry detail supabase error [${requestId}]:`, error);
      return apiError('upstream_error', 'Could not load entry details.', requestId);
    }
    if (!data) {
      return apiError('not_found', 'Entry not found.', requestId);
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
        'x-request-id': requestId,
      },
    });
  } catch (e) {
    console.error(`[api] entry detail unhandled [${requestId}]:`, e);
    return apiError('internal_error', 'Something went wrong on our end.', requestId);
  }
}
