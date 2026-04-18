import { NextRequest, NextResponse } from 'next/server';
import { submitSchema } from '@/lib/validation';
import { createAdminClient } from '@/lib/supabase/admin';
import { geocodeCity, jitterCoords } from '@/lib/geocode';
import { generateToken } from '@/lib/tokens';
import {
  sendEntryVerificationEmail,
  sendParentConsentEmail,
} from '@/lib/email';
import { checkRateLimit, logAudit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  // Rate limit: 5 submissions per IP per hour
  const allowed = await checkRateLimit(ip, 'submit.attempt', 5, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many submissions from this connection. Please try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return NextResponse.json(
      { error: firstError?.message || 'Invalid submission' },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Honeypot — if bot filled it, silently fake success
  if (data.honeypot && data.honeypot.length > 0) {
    await logAudit('submit.honeypot', { meta: { ip } });
    return NextResponse.json({
      message: 'If that email is valid, you\'ll receive a verification link shortly.',
    });
  }

  const supabase = createAdminClient();

  // Check if email already has an entry
  const { data: existing } = await supabase
    .from('entries')
    .select('id, is_visible, deleted_at')
    .eq('email', data.email)
    .is('deleted_at', null)
    .maybeSingle();

  if (existing) {
    await logAudit('submit.duplicate', { actor: data.email, meta: { ip } });
    // Don't reveal account existence — generic message
    return NextResponse.json({
      message: 'If that email is valid, you\'ll receive a verification link shortly.',
    });
  }

  // Geocode the city
  const query = [data.city, data.region, data.country].filter(Boolean).join(', ');
  const geo = await geocodeCity(query);
  if (!geo) {
    return NextResponse.json(
      { error: "We couldn't find that city. Please check the spelling or try a nearby larger town." },
      { status: 400 }
    );
  }

  // Apply jitter in app code (DB also jitters on insert as belt-and-suspenders,
  // but we call jitterCoords here so the jittered value is what gets persisted).
  const jittered = jitterCoords(geo.lat, geo.lng);

  // Handle parent consent flow for minors
  let parentConsentId: string | null = null;
  let parentConsentToken: string | null = null;
  if (data.ageBand === '13-17') {
    parentConsentToken = generateToken();
    const { data: consent, error: consentErr } = await supabase
      .from('parent_consents')
      .insert({
        minor_display_name: data.displayName,
        minor_email: data.email,
        parent_name: data.parentName!,
        parent_email: data.parentEmail!,
        relationship: data.relationship!,
        consent_token: parentConsentToken,
      })
      .select('id')
      .single();

    if (consentErr || !consent) {
      console.error('Parent consent insert failed:', consentErr);
      return NextResponse.json({ error: 'Could not save consent record. Please try again.' }, { status: 500 });
    }
    parentConsentId = consent.id;
  }

  // Insert entry (not visible yet — needs email verification, plus parent consent if minor)
  const { data: entry, error: entryErr } = await supabase
    .from('entries')
    .insert({
      display_name: data.displayName,
      email: data.email,
      city: geo.city || data.city,
      region: data.region || geo.region || null,
      country: data.country || geo.country || 'US',
      bio: data.bio || null,
      socials: data.socials || {},
      lat: jittered.lat,
      lng: jittered.lng,
      age_band: data.ageBand,
      parent_consent_id: parentConsentId,
      is_visible: false,
    })
    .select('id')
    .single();

  if (entryErr || !entry) {
    console.error('Entry insert failed:', entryErr);
    return NextResponse.json({ error: 'Could not save your entry. Please try again.' }, { status: 500 });
  }

  // Create email verification token for the submitter
  const emailToken = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  const { error: tokenErr } = await supabase.from('verification_tokens').insert({
    entry_id: entry.id,
    token: emailToken,
    purpose: 'email_verify',
    expires_at: expiresAt,
  });
  if (tokenErr) {
    console.error('Token insert failed:', tokenErr);
    return NextResponse.json({ error: 'Could not create verification link. Please try again.' }, { status: 500 });
  }

  // Send verification email to submitter
  try {
    await sendEntryVerificationEmail(data.email, data.displayName, emailToken);
  } catch (e) {
    console.error('Failed to send verification email:', e);
    // Entry is already created; continue so we don't double-insert on retry
  }

  // Send parent consent email if minor
  if (data.ageBand === '13-17' && parentConsentToken && data.parentEmail && data.parentName) {
    try {
      await sendParentConsentEmail(data.parentEmail, data.parentName, data.displayName, parentConsentToken);
    } catch (e) {
      console.error('Failed to send parent consent email:', e);
    }
  }

  await logAudit('entry.submitted', {
    actor: data.email,
    targetId: entry.id,
    meta: { ip, ageBand: data.ageBand, city: data.city, country: data.country },
  });

  return NextResponse.json({
    message: data.ageBand === '13-17'
      ? 'Thanks! Check your email to verify your address. We also sent a consent link to your parent or guardian.'
      : 'Thanks! Check your email to verify your address. Your entry will appear on the map once verified.',
  });
}
