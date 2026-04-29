import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { geocodeCity, jitterCoords } from '@/lib/geocode';
import { logAudit, getClientIp } from '@/lib/rate-limit';
import { apiError, withErrorHandling } from '@/lib/api-error';
import { revalidateEntryLocations } from '@/lib/revalidate';

export const runtime = 'nodejs';

const updateSchema = z.object({
  token: z.string().min(1),
  display_name: z.string().trim().min(2).max(40),
  city: z.string().trim().min(2).max(80),
  region: z.string().trim().max(80).nullable().optional(),
  country: z.string().trim().length(2).default('US'),
  bio: z.string().trim().max(280).nullable().optional(),
  socials: z.object({
    instagram: z.string().trim().max(50).optional().or(z.literal('')),
    youtube: z.string().trim().max(100).optional().or(z.literal('')),
    discord: z.string().trim().max(50).optional().or(z.literal('')),
    website: z.string().trim().max(200).optional().or(z.literal('')),
  }).optional(),
  // Club-specific fields
  club_meeting_info: z.string().trim().max(500).nullable().optional(),
  club_venue_public: z.boolean().optional(),
  // Shop-specific fields
  address_line: z.string().trim().max(200).nullable().optional(),
  postal_code: z.string().trim().max(20).nullable().optional(),
  hours: z.string().trim().max(500).nullable().optional(),
  // Shared org fields
  contact_name: z.string().trim().max(100).nullable().optional(),
});

export const POST = withErrorHandling(async (requestId: string, req: NextRequest) => {
  const ip = getClientIp(req.headers);
  let body: unknown;
  try { body = await req.json(); } catch { return apiError('bad_request', 'Invalid body.', requestId); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError('bad_request', parsed.error.errors[0]?.message || 'Invalid input.', requestId);

  const supabase = createAdminClient();
  const { data: tok } = await supabase
    .from('verification_tokens')
    .select('entry_id, expires_at, purpose, used_at')
    .eq('token', parsed.data.token)
    .maybeSingle();

  if (!tok || tok.purpose !== 'edit_link' || tok.used_at || new Date(tok.expires_at) < new Date()) {
    return apiError('unauthorized', 'Link invalid or expired.', requestId);
  }

  const { data: existing } = await supabase
    .from('entries')
    .select('city, region, country, lat, lng')
    .eq('id', tok.entry_id)
    .maybeSingle();
  if (!existing) return apiError('not_found', 'Entry not found.', requestId);

  const d = parsed.data;
  let lat = existing.lat;
  let lng = existing.lng;

  // Re-geocode if location changed
  const locationChanged =
    d.city !== existing.city ||
    (d.region ?? null) !== existing.region ||
    d.country !== existing.country;
  if (locationChanged) {
    const geo = await geocodeCity({
      city: d.city,
      region: d.region || undefined,
      country: d.country,
    });
    if (!geo) {
      return apiError('unprocessable', "Couldn't locate that city. Check spelling.", requestId);
    }
    lat = geo.lat;
    lng = geo.lng;
  }

  const { error: updateErr } = await supabase
    .from('entries')
    .update({
      display_name: d.display_name,
      city: d.city,
      region: d.region || null,
      country: d.country,
      bio: d.bio || null,
      socials: d.socials || {},
      lat,
      lng,
      // Type-specific fields — only written if present in payload
      ...(d.club_meeting_info !== undefined && { club_meeting_info: d.club_meeting_info || null }),
      ...(d.club_venue_public !== undefined && { club_venue_public: d.club_venue_public }),
      ...(d.address_line !== undefined && { address_line: d.address_line || null }),
      ...(d.postal_code !== undefined && { postal_code: d.postal_code || null }),
      ...(d.hours !== undefined && { hours: d.hours || null }),
      ...(d.contact_name !== undefined && { contact_name: d.contact_name || null }),
    })
    .eq('id', tok.entry_id);

  if (updateErr) {
    console.error(`[api] profile update failed [${requestId}]:`, updateErr);
    return apiError('upstream_error', 'Update failed.', requestId);
  }

  await logAudit('entry.updated', { targetId: tok.entry_id, meta: { ip, locationChanged } });

  // Revalidate the new location, plus the old one if they moved cities.
  revalidateEntryLocations({ country: d.country, region: d.region, city: d.city });
  if (locationChanged) {
    revalidateEntryLocations({
      country: existing.country,
      region: existing.region,
      city: existing.city,
    });
  }

  return NextResponse.json({ ok: true, requestId }, { headers: { 'x-request-id': requestId } });
});
