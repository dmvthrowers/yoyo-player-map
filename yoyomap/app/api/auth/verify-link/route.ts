import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const supabase = createAdminClient();
  const { data: tok, error } = await supabase
    .from('verification_tokens')
    .select('*, entries(id, display_name, city, region, country, bio, socials, email, age_band, is_visible, deleted_at)')
    .eq('token', token)
    .eq('purpose', 'edit_link')
    .maybeSingle();

  if (error || !tok) return NextResponse.json({ error: 'Link invalid.' }, { status: 401 });
  if (tok.used_at) return NextResponse.json({ error: 'Link already used.' }, { status: 401 });
  if (new Date(tok.expires_at) < new Date()) return NextResponse.json({ error: 'Link expired. Request a new one.' }, { status: 401 });

  const entry = tok.entries as {
    id: string; display_name: string; city: string; region: string | null; country: string;
    bio: string | null; socials: Record<string, string>; email: string; age_band: string;
    is_visible: boolean; deleted_at: string | null;
  };
  if (!entry || entry.deleted_at) return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });

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
      email: entry.email,
      age_band: entry.age_band,
      is_visible: entry.is_visible,
    },
  });
}
