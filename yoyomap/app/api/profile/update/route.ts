import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { geocodeCity, jitterCoords } from '@/lib/geocode';
import { logAudit, getClientIp } from '@/lib/rate-limit';
import { apiError, withErrorHandling } from '@/lib/api-error';

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
    const jittered = jitterCoords(geo.lat, geo.lng);
    lat = jittered.lat;
    lng = jittered.lng;
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
    })
    .eq('id', tok.entry_id);

  if (updateErr) {
    console.error(`[api] profile update failed [${requestId}]:`, updateErr);
    return apiError('upstream_error', 'Update failed.', requestId);
  }

  await logAudit('entry.updated', { targetId: tok.entry_id, meta: { ip, locationChanged } });
  return NextResponse.json({ ok: true, requestId }, { headers: { 'x-request-id': requestId } });
});
