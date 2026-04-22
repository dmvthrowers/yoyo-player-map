import { NextRequest, NextResponse } from 'next/server';
import { submitSchema, legacySubmitSchema, type SubmitInput, type PersonInput, type ShopInput, type ClubInput } from '@/lib/validation';
import { createAdminClient } from '@/lib/supabase/admin';
import { geocodeCity, geocodeAddress, jitterCoords } from '@/lib/geocode';
import { generateToken } from '@/lib/tokens';
import {
  sendEntryVerificationEmail,
  sendParentConsentEmail,
} from '@/lib/email';
import { checkRateLimit, logAudit, getClientIp } from '@/lib/rate-limit';
import { apiError, withErrorHandling } from '@/lib/api-error';

export const runtime = 'nodejs';

/**
 * Check if shop owner email domain matches website domain.
 * Returns true if the email domain matches the website's domain.
 */
function checkVerifiedOwner(email: string, socials?: { website?: string }): boolean {
  if (!socials?.website) return false;
  
  try {
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (!emailDomain) return false;
    
    const websiteUrl = new URL(socials.website);
    const websiteDomain = websiteUrl.hostname.replace(/^www\./, '').toLowerCase();
    
    // Check if email domain matches website domain (or is a subdomain)
    return emailDomain === websiteDomain || websiteDomain.endsWith('.' + emailDomain);
  } catch {
    return false;
  }
}

export const POST = withErrorHandling(async (requestId: string, req: NextRequest) => {
  const ip = getClientIp(req.headers);

  // Rate limit: 5 submissions per IP per hour
  const allowed = await checkRateLimit(ip, 'submit.attempt', 5, 60);
  if (!allowed) {
    return apiError('rate_limited', 'Too many submissions from this connection. Please try again later.', requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('bad_request', 'Invalid request body.', requestId);
  }

  // Try new discriminated union schema first, fall back to legacy for backwards compatibility
  let data: SubmitInput;
  const parsed = submitSchema.safeParse(body);
  if (parsed.success) {
    data = parsed.data;
  } else {
    // Try legacy schema (person-only, no entityType field)
    const legacyParsed = legacySubmitSchema.safeParse(body);
    if (legacyParsed.success) {
      data = { ...legacyParsed.data, entityType: 'person' } as PersonInput;
    } else {
      const firstError = parsed.error.errors[0];
      return apiError('bad_request', firstError?.message || 'Invalid submission.', requestId);
    }
  }

  // Honeypot — if bot filled it, silently fake success
  if (data.honeypot && data.honeypot.length > 0) {
    await logAudit('submit.honeypot', { meta: { ip } });
    return NextResponse.json({
      message: "If that email is valid, you'll receive a verification link shortly.",
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
      message: "If that email is valid, you'll receive a verification link shortly.",
    });
  }

  // Branch based on entity type
  let entryData;
  switch (data.entityType) {
    case 'person':
      entryData = await preparePersonEntry(data, ip);
      break;
    case 'shop':
      entryData = await prepareShopEntry(data, ip);
      break;
    case 'club':
      entryData = await prepareClubEntry(data, ip);
      break;
  }

  if ('error' in entryData) {
    return apiError('unprocessable', entryData.error, requestId);
  }

  // Handle parent consent flow for minors (person only)
  let parentConsentId: string | null = null;
  let parentConsentToken: string | null = null;
  if (data.entityType === 'person' && data.ageBand === '13-17') {
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
      console.error(`[api] parent consent insert failed [${requestId}]:`, consentErr);
      return apiError('upstream_error', 'Could not save consent record. Please try again.', requestId);
    }
    parentConsentId = consent.id;
  }

  // Insert entry (not visible yet — needs email verification, plus parent consent if minor)
  const { data: entry, error: entryErr } = await supabase
    .from('entries')
    .insert({
      ...entryData.columns,
      parent_consent_id: parentConsentId,
      is_visible: false,
    })
    .select('id')
    .single();

  if (entryErr || !entry) {
    console.error(`[api] entry insert failed [${requestId}]:`, entryErr);
    return apiError('upstream_error', 'Could not save your entry. Please try again.', requestId);
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
    console.error(`[api] verification token insert failed [${requestId}]:`, tokenErr);
    return apiError('upstream_error', 'Could not create verification link. Please try again.', requestId);
  }

  // Send verification email (may be queued if Resend is over daily cap)
  const verifyOutcome = await sendEntryVerificationEmail(data.email, data.displayName, emailToken);

  // Parent consent — same queue-aware send
  const consentOutcome = data.entityType === 'person' && data.ageBand === '13-17' && parentConsentToken && data.parentEmail && data.parentName
    ? await sendParentConsentEmail(data.parentEmail, data.parentName, data.displayName, parentConsentToken)
    : null;

  await logAudit('entry.submitted', {
    actor: data.email,
    targetId: entry.id,
    meta: {
      ip,
      entityType: data.entityType,
      city: data.city,
      country: data.country,
      verifyStatus: verifyOutcome.status,
      consentStatus: consentOutcome?.status,
    },
  });

  // Compose a message based on whether the primary verification email was sent
  // or queued. For minors, the parent consent email matters too — if either is
  // delayed, tell the user both will go out after the limit resets.
  const isMinor = data.entityType === 'person' && data.ageBand === '13-17';
  const anyFailed = verifyOutcome.status === 'failed' || consentOutcome?.status === 'failed';

  const queuedOutcome = verifyOutcome.status === 'queued'
    ? verifyOutcome
    : consentOutcome?.status === 'queued'
      ? consentOutcome
      : null;

  let message: string;
  if (queuedOutcome) {
    const retryAt = queuedOutcome.retryAt;
    const isDaily = queuedOutcome.kind === 'daily_quota';
    if (isDaily) {
      message = `Thanks! Your entry is saved, but we've hit our daily email limit. We'll send your verification link${isMinor ? ' (and the parent consent email)' : ''} automatically after the limit resets at midnight UTC. No action needed from you — just watch your inbox tomorrow.`;
    } else {
      message = `Thanks! Your entry is saved. Our email service is briefly throttled, so your verification link${isMinor ? ' (and the parent consent email)' : ''} will arrive shortly — please check back in a minute or two.`;
    }
    return NextResponse.json({
      message,
      emailStatus: 'queued',
      retryAt,
    });
  }

  if (verifyOutcome.status === 'failed') {
    // Entry exists but we couldn't email. Tell the user so they can contact support rather than waiting forever.
    return NextResponse.json({
      message: "Thanks! Your entry is saved, but we hit a problem sending your verification email. Please contact dmvthrowers@gmail.com and we'll sort it out manually.",
      emailStatus: 'failed',
    });
  }

  const messages = {
    person: isMinor
      ? (consentOutcome?.status === 'failed'
          ? "Thanks! Check your email to verify your address. We had trouble sending the parent consent email — please contact dmvthrowers@gmail.com so we can resend it."
          : 'Thanks! Check your email to verify your address. We also sent a consent link to your parent or guardian.')
      : 'Thanks! Check your email to verify your address. Your entry will appear on the map once verified.',
    shop: 'Thanks for registering your shop! Check your email to verify. Your listing will appear on the map once verified.',
    club: 'Thanks for registering your club! Check your email to verify. Your listing will appear on the map once verified.',
  };

  return NextResponse.json(
    {
      message: messages[data.entityType],
      emailStatus: anyFailed ? 'partial_failed' : 'sent',
      requestId,
    },
    { headers: { 'x-request-id': requestId } },
  );
});

// =============================================================================
// Entry preparation functions
// =============================================================================

interface PreparedEntry {
  columns: Record<string, unknown>;
}

interface PrepareError {
  error: string;
}

async function preparePersonEntry(data: PersonInput, ip: string): Promise<PreparedEntry | PrepareError> {
  // Geocode the city
  const geo = await geocodeCity({
    city: data.city,
    region: data.region || undefined,
    country: data.country,
  });
  if (!geo) {
    return { error: "We couldn't find that city. Please check the spelling or try a nearby larger town." };
  }

  // Apply jitter for privacy
  const jittered = jitterCoords(geo.lat, geo.lng);

  return {
    columns: {
      entity_type: 'person',
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
      // Null out shop/club fields
      exact_lat: null,
      exact_lng: null,
      address_line: null,
      postal_code: null,
      hours: null,
      club_meeting_info: null,
      club_venue_public: null,
      contact_name: null,
      verified_owner: false,
    },
  };
}

async function prepareShopEntry(data: ShopInput, ip: string): Promise<PreparedEntry | PrepareError> {
  // Geocode the street address for exact coords
  const exactGeo = await geocodeAddress({
    addressLine: data.addressLine,
    city: data.city,
    region: data.region || undefined,
    postalCode: data.postalCode || undefined,
    country: data.country,
  });

  if (!exactGeo) {
    return { error: "We couldn't find that address. Please check the spelling and try again." };
  }

  // Also get city-level jittered coords as fallback (stored but not exposed)
  const cityGeo = await geocodeCity({
    city: data.city,
    region: data.region || undefined,
    country: data.country,
  });
  const jittered = cityGeo ? jitterCoords(cityGeo.lat, cityGeo.lng) : jitterCoords(exactGeo.lat, exactGeo.lng);

  // Check if owner's email domain matches website domain
  const verifiedOwner = checkVerifiedOwner(data.email, data.socials);

  return {
    columns: {
      entity_type: 'shop',
      display_name: data.displayName,
      email: data.email,
      city: cityGeo?.city || exactGeo.city || data.city,
      region: data.region || cityGeo?.region || exactGeo.region || null,
      country: data.country || exactGeo.country || 'US',
      bio: data.bio || null,
      socials: data.socials || {},
      lat: jittered.lat,  // Jittered fallback
      lng: jittered.lng,
      exact_lat: exactGeo.lat,  // Exact coords for shop
      exact_lng: exactGeo.lng,
      address_line: data.addressLine,
      postal_code: data.postalCode || null,
      hours: data.hours || null,
      contact_name: data.contactName,
      verified_owner: verifiedOwner,
      // Null out person/club fields
      age_band: null,
      club_meeting_info: null,
      club_venue_public: null,
    },
  };
}

async function prepareClubEntry(data: ClubInput, ip: string): Promise<PreparedEntry | PrepareError> {
  // Geocode city for base coords
  const cityGeo = await geocodeCity({
    city: data.city,
    region: data.region || undefined,
    country: data.country,
  });
  if (!cityGeo) {
    return { error: "We couldn't find that city. Please check the spelling or try a nearby larger town." };
  }

  // Apply jitter for the base coords
  const jittered = jitterCoords(cityGeo.lat, cityGeo.lng);

  let exactLat: number | null = null;
  let exactLng: number | null = null;

  // If venue is public, geocode the venue address
  if (data.clubVenuePublic && data.venueAddressLine) {
    const venueGeo = await geocodeAddress({
      addressLine: data.venueAddressLine,
      city: data.city,
      region: data.region || undefined,
      postalCode: data.venuePostalCode || undefined,
      country: data.country,
    });

    if (!venueGeo) {
      return { error: "We couldn't find the venue address. Please check the spelling and try again." };
    }

    exactLat = venueGeo.lat;
    exactLng = venueGeo.lng;
  }

  return {
    columns: {
      entity_type: 'club',
      display_name: data.displayName,
      email: data.email,
      city: cityGeo.city || data.city,
      region: data.region || cityGeo.region || null,
      country: data.country || cityGeo.country || 'US',
      bio: data.bio || null,
      socials: data.socials || {},
      lat: jittered.lat,
      lng: jittered.lng,
      exact_lat: exactLat,  // Only set if venue is public
      exact_lng: exactLng,
      club_meeting_info: data.clubMeetingInfo,
      club_venue_public: data.clubVenuePublic,
      contact_name: data.contactName,
      // Null out person/shop fields
      age_band: null,
      address_line: null,
      postal_code: null,
      hours: null,
      verified_owner: false,
    },
  };
}
