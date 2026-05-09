import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { geocodeCity, geocodeAddress, jitterCoords } from '@/lib/geocode';
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
  if (!parsed.success) return apiError('bad_request', parsed.error.issues[0]?.message || 'Invalid input.', requestId);

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
    .select('city, region, country, lat, lng, entity_type, address_line, postal_code, club_venue_public, exact_lat, exact_lng')
    .eq('id', tok.entry_id)
    .maybeSingle();
  if (!existing) return apiError('not_found', 'Entry not found.', requestId);

  const d = parsed.data;
  let lat = existing.lat;
  let lng = existing.lng;
  let exactLat = existing.exact_lat as number | null;
  let exactLng = existing.exact_lng as number | null;

  // Re-geocode if city/region/country changed
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
    const venuePublic = d.club_venue_public ?? existing.club_venue_public ?? false;
    const needsJitter =
      existing.entity_type === 'person' ||
      (existing.entity_type === 'club' && !venuePublic);
    if (needsJitter) {
      const j = jitterCoords(geo.lat, geo.lng);
      lat = j.lat;
      lng = j.lng;
    } else {
      lat = geo.lat;
      lng = geo.lng;
    }
  }

  // Re-geocode the precise address for shops, and for clubs that publish their venue.
  // Triggers when the address text changes OR when location changed (so the new city's
  // context is applied) OR when a club just toggled venue-public on.
  const isShop = existing.entity_type === 'shop';
  const isClubVenuePublic =
    existing.entity_type === 'club' &&
    (d.club_venue_public ?? existing.club_venue_public) === true;
  const venueWasPrivate = existing.entity_type === 'club' && existing.club_venue_public !== true;
  const newAddress = d.address_line ?? existing.address_line;
  const newPostal = d.postal_code ?? existing.postal_code;
  const addressChanged =
    (d.address_line !== undefined && (d.address_line || null) !== existing.address_line) ||
    (d.postal_code !== undefined && (d.postal_code || null) !== existing.postal_code);

  const shouldGeocodeAddress =
    !!newAddress &&
    (isShop || isClubVenuePublic) &&
    (addressChanged || locationChanged || (isClubVenuePublic && venueWasPrivate));

  if (shouldGeocodeAddress) {
    const addrGeo = await geocodeAddress({
      addressLine: newAddress!,
      city: d.city,
      region: d.region || undefined,
      postalCode: newPostal || undefined,
      country: d.country,
    });
    if (addrGeo) {
      exactLat = addrGeo.lat;
      exactLng = addrGeo.lng;
    } else {
      // Geocoding failed — clear exact coords so the venue pin doesn't show
      // a stale or wrong location. The entry still saves at city-level.
      exactLat = null;
      exactLng = null;
    }
  } else if (existing.entity_type === 'club' && d.club_venue_public === false) {
    // Club just made venue private — clear the precise coords.
    exactLat = null;
    exactLng = null;
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
      exact_lat: exactLat,
      exact_lng: exactLng,
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

  // On-demand revalidate the map page (ISR cache bust)
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/revalidate-map?secret=${process.env.REVALIDATE_SECRET}`,
      { method: 'POST' });
  } catch (e) {
    // Ignore errors, not critical for user
  }

  return NextResponse.json({ ok: true, requestId }, { headers: { 'x-request-id': requestId } });
});
