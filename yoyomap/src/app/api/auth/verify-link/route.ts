import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { hashToken } from '@/lib/tokens';
import { apiError, withErrorHandling } from '@/lib/api-error';

export const runtime = 'nodejs';

export const GET = withErrorHandling(async (requestId: string, req: NextRequest) => {
  const ip = getClientIp(req.headers);
  const allowed = await checkRateLimit(ip, 'verify_link.get', 10, 60);
  if (!allowed) return apiError('rate_limited', 'Too many requests.', requestId);

  const token = req.nextUrl.searchParams.get('token');
  if (!token) return apiError('bad_request', 'Missing token', requestId);

  const supabase = createAdminClient();
  const { data: tok, error } = await supabase
    .from('verification_tokens')
    .select('*, entries(id, display_name, city, region, country, bio, socials, is_visible, deleted_at, entity_type, club_meeting_info, club_venue_public, contact_name, address_line, postal_code, hours)')
    .eq('token', await hashToken(token))
    .eq('purpose', 'edit_link')
    .maybeSingle();

  if (error || !tok) return apiError('unauthorized', 'Link invalid.', requestId);
  if (tok.used_at) return apiError('unauthorized', 'Link already used.', requestId);
  if (new Date(tok.expires_at) < new Date()) return apiError('unauthorized', 'Link expired. Request a new one.', requestId);

  const entry = tok.entries as {
    id: string; display_name: string; city: string; region: string | null; country: string;
    bio: string | null; socials: Record<string, string>;
    is_visible: boolean; deleted_at: string | null;
    entity_type: 'person' | 'shop' | 'club';
    club_meeting_info: string | null;
    club_venue_public: boolean | null;
    contact_name: string | null;
    address_line: string | null;
    postal_code: string | null;
    hours: string | null;
  };
  if (!entry || entry.deleted_at) return apiError('not_found', 'Entry not found.', requestId);

  // Note: we do NOT mark the token used yet — we need it valid through the edit/save flow.
  // Token stays valid until expires_at.

  return NextResponse.json({
    entry: {
      id: entry.id,
      display_name: entry.display_name,
      city: entry.city,
      region: entry.region,
      country: entry.country,
      bio: entry.bio,
      socials: entry.socials || {},
      is_visible: entry.is_visible,
      entity_type: entry.entity_type,
      club_meeting_info: entry.club_meeting_info,
      club_venue_public: entry.club_venue_public ?? false,
      contact_name: entry.contact_name,
      address_line: entry.address_line,
      postal_code: entry.postal_code,
      hours: entry.hours,
    },
  });
});
