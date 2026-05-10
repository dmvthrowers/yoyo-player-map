import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { geocodeCity, jitterCoords } from '@/lib/geocode';
import { getClientIp, logAudit } from '@/lib/rate-limit';
import { revalidateEntryLocations } from '@/lib/revalidate';
import { apiError, withErrorHandling } from '@/lib/api-error';

export const runtime = 'nodejs';

const postSchema = z.object({
  token: z.string().min(1),
  mode: z.enum(['confirm', 'update']),
  city: z.string().trim().min(2).max(80).optional(),
  region: z.string().trim().max(80).optional(),
  country: z.string().trim().length(2).optional(),
}).superRefine((data, ctx) => {
  if (data.mode === 'update') {
    if (!data.city) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'City is required.', path: ['city'] });
    }
    if (!data.country) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Country is required.', path: ['country'] });
    }
  }
});

function tokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

export const GET = withErrorHandling(async (requestId: string, req: NextRequest) => {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return apiError('bad_request', 'Missing token.', requestId);

  const supabase = createAdminClient();
  const { data: tok, error } = await supabase
    .from('verification_tokens')
    .select('id, entry_id, purpose, used_at, expires_at')
    .eq('token', token)
    .eq('purpose', 'location_confirm')
    .maybeSingle();

  if (error || !tok) return apiError('unauthorized', 'Link invalid.', requestId);
  if (tok.used_at) return apiError('unauthorized', 'Link already used.', requestId);
  if (tokenExpired(tok.expires_at)) return apiError('unauthorized', 'Link expired.', requestId);

  const { data: entry } = await supabase
    .from('entries')
    .select('id, display_name, city, region, country, location_status, deleted_at')
    .eq('id', tok.entry_id)
    .maybeSingle();

  if (!entry || entry.deleted_at) return apiError('not_found', 'Entry not found.', requestId);

  return NextResponse.json({
    ok: true,
    entry: {
      id: entry.id,
      displayName: entry.display_name,
      city: entry.city,
      region: entry.region,
      country: entry.country,
      locationStatus: entry.location_status,
    },
    requestId,
  }, { headers: { 'x-request-id': requestId } });
});

export const POST = withErrorHandling(async (requestId: string, req: NextRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('bad_request', 'Invalid body.', requestId);
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('bad_request', parsed.error.issues[0]?.message || 'Invalid input.', requestId);
  }

  const supabase = createAdminClient();
  const ip = getClientIp(req.headers);
  const { token, mode } = parsed.data;

  const { data: tok } = await supabase
    .from('verification_tokens')
    .select('id, entry_id, purpose, used_at, expires_at')
    .eq('token', token)
    .eq('purpose', 'location_confirm')
    .maybeSingle();

  if (!tok) return apiError('unauthorized', 'Link invalid.', requestId);
  if (tok.used_at) return apiError('unauthorized', 'Link already used.', requestId);
  if (tokenExpired(tok.expires_at)) return apiError('unauthorized', 'Link expired.', requestId);

  const { data: entry } = await supabase
    .from('entries')
    .select('id, city, region, country, entity_type, club_venue_public, deleted_at')
    .eq('id', tok.entry_id)
    .maybeSingle();

  if (!entry || entry.deleted_at) return apiError('not_found', 'Entry not found.', requestId);

  const previousLoc = { country: entry.country, region: entry.region, city: entry.city };
  const updates: Record<string, unknown> = { location_status: 'verified' };

  if (mode === 'update') {
    const region = parsed.data.region ?? null;
    const geo = await geocodeCity({
      city: parsed.data.city!,
      region: parsed.data.region || undefined,
      country: parsed.data.country!,
    });
    if (!geo) return apiError('unprocessable', "Couldn't locate that city. Check spelling.", requestId);

    const needsJitter =
      entry.entity_type === 'person' ||
      (entry.entity_type === 'club' && !entry.club_venue_public);
    const coords = needsJitter ? jitterCoords(geo.lat, geo.lng) : geo;

    updates.city = parsed.data.city;
    updates.region = region;
    updates.country = parsed.data.country;
    updates.lat = coords.lat;
    updates.lng = coords.lng;
  }

  const { error: updateError } = await supabase
    .from('entries')
    .update(updates)
    .eq('id', tok.entry_id);
  if (updateError) return apiError('upstream_error', 'Could not update entry.', requestId);

  await supabase
    .from('verification_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tok.id);

  await logAudit('location.confirmed', {
    targetId: tok.entry_id,
    meta: { ip, mode },
  });

  const nextLoc = {
    country: (updates.country as string | undefined) ?? entry.country,
    region: (updates.region as string | null | undefined) ?? entry.region,
    city: (updates.city as string | undefined) ?? entry.city,
  };

  revalidateEntryLocations(previousLoc);
  if (mode === 'update') {
    revalidateEntryLocations(nextLoc);
  }

  return NextResponse.json({ ok: true, requestId }, { headers: { 'x-request-id': requestId } });
});
