import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { geocodeCity, jitterCoords } from '@/lib/geocode';
import { logAudit, getClientIp } from '@/lib/rate-limit';

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

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid' }, { status: 400 });

  const supabase = createAdminClient();
  const { data: tok } = await supabase
    .from('verification_tokens')
    .select('entry_id, expires_at, purpose, used_at')
    .eq('token', parsed.data.token)
    .maybeSingle();

  if (!tok || tok.purpose !== 'edit_link' || tok.used_at || new Date(tok.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Link invalid or expired.' }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from('entries')
    .select('city, region, country, lat, lng')
    .eq('id', tok.entry_id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });

  const d = parsed.data;
  let lat = existing.lat;
  let lng = existing.lng;

  // Re-geocode if location changed
  const locationChanged =
    d.city !== existing.city ||
    (d.region ?? null) !== existing.region ||
    d.country !== existing.country;
  if (locationChanged) {
    const query = [d.city, d.region, d.country].filter(Boolean).join(', ');
    const geo = await geocodeCity(query);
    if (!geo) {
      return NextResponse.json({ error: "Couldn't locate that city. Check spelling." }, { status: 400 });
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
    console.error('Update failed:', updateErr);
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }

  await logAudit('entry.updated', { targetId: tok.entry_id, meta: { ip, locationChanged } });
  return NextResponse.json({ ok: true });
}
