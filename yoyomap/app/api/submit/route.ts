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

function normalizeEmptyStrings(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, v === '' ? undefined : v])
  );
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
  const normalized = normalizeEmptyStrings(body);
  const parsed = submitSchema.safeParse(normalized);
  if (parsed.success) {
    data = parsed.data;
  } else {
    // Try legacy schema (person-only, no entityType field)
    const legacyParsed = legacySubmitSchema.safeParse(normalized);
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
      entryData = await preparePersonEntry(data, ip, supabase);
      break;
    case 'shop':
      entryData = await prepareShopEntry(data, ip, supabase);
      break;
    case 'club':
      entryData = await prepareClubEntry(data, ip, supabase);
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
      city_id: data.city_id,
      country_id: data.country_id,
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

async function resolveLocationNames(
  supabase: ReturnType<typeof createAdminClient>,
  cityId: number,
  regionId: number | null | undefined,
  countryId: number,
): Promise<{ cityName: string; regionName: string | null; countryCode: string } | null> {
  const [cityRes, countryRes, regionRes] = await Promise.all([
    supabase.from('cities').select('name').eq('id', cityId).single(),
    supabase.from('countries').select('code').eq('id', countryId).single(),
    regionId
      ? supabase.from('regions').select('name').eq('id', regionId).single()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (cityRes.error || !cityRes.data || countryRes.error || !countryRes.data) return null;
  return {
    cityName: cityRes.data.name,
    regionName: regionRes.data?.name ?? null,
    countryCode: countryRes.data.code,
  };
}

interface PreparedEntry {
  columns: Record<string, unknown>;
}

interface PrepareError {
  error: string;
}

async function preparePersonEntry(
  data: PersonInput,
  ip: string,
  supabase: ReturnType<typeof createAdminClient>,
): Promise<PreparedEntry | PrepareError> {
  const loc = await resolveLocationNames(supabase, data.city_id, data.region_id, data.country_id);
  if (!loc) return { error: "We couldn't resolve your location. Please try again." };

  const geo = await geocodeCity({
    city: loc.cityName,
    region: loc.regionName || undefined,
    country: loc.countryCode,
  });
  if (!geo) {
    return { error: "We couldn't find that city. Please check the spelling or try a nearby larger town." };
  }

  return {
    columns: {
      entity_type: 'person',
      display_name: data.displayName,
      email: data.email,
      city_id: data.city_id,
      region_id: data.region_id ?? null,
      country_id: data.country_id,
      city: geo.city || loc.cityName,
      region: loc.regionName || geo.region || null,
      country: geo.country || loc.countryCode,
      bio: data.bio || null,
      socials: data.socials || {},
      lat: geo.lat,
      lng: geo.lng,
      age_band: data.ageBand,
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

async function prepareShopEntry(
  data: ShopInput,
  ip: string,
  supabase: ReturnType<typeof createAdminClient>,
): Promise<PreparedEntry | PrepareError> {
  const loc = await resolveLocationNames(supabase, data.city_id, data.region_id, data.country_id);
  if (!loc) return { error: "We couldn't resolve your location. Please try again." };

  const exactGeo = await geocodeAddress({
    addressLine: data.addressLine,
    city: loc.cityName,
    region: loc.regionName || undefined,
    postalCode: data.postalCode || undefined,
    country: loc.countryCode,
  });
  if (!exactGeo) {
    return { error: "We couldn't find that address. Please check the spelling and try again." };
  }

  const cityGeo = await geocodeCity({
    city: loc.cityName,
    region: loc.regionName || undefined,
    country: loc.countryCode,
  });
  const verifiedOwner = checkVerifiedOwner(data.email, data.socials);

  // Use cityGeo if available, else exactGeo for map pin (raw, let DB jitter)
  const lat = cityGeo ? cityGeo.lat : exactGeo.lat;
  const lng = cityGeo ? cityGeo.lng : exactGeo.lng;

  return {
    columns: {
      entity_type: 'shop',
      display_name: data.displayName,
      email: data.email,
      city_id: data.city_id,
      region_id: data.region_id ?? null,
      country_id: data.country_id,
      city: cityGeo?.city || exactGeo.city || loc.cityName,
      region: loc.regionName || cityGeo?.region || exactGeo.region || null,
      country: exactGeo.country || loc.countryCode,
      bio: data.bio || null,
      socials: data.socials || {},
      lat,
      lng,
      exact_lat: exactGeo.lat,
      exact_lng: exactGeo.lng,
      address_line: data.addressLine,
      postal_code: data.postalCode || null,
      hours: data.hours || null,
      contact_name: data.contactName,
      verified_owner: verifiedOwner,
      age_band: null,
      club_meeting_info: null,
      club_venue_public: null,
    },
  };
}

async function prepareClubEntry(
  data: ClubInput,
  ip: string,
  supabase: ReturnType<typeof createAdminClient>,
): Promise<PreparedEntry | PrepareError> {
  const loc = await resolveLocationNames(supabase, data.city_id, data.region_id, data.country_id);
  if (!loc) return { error: "We couldn't resolve your location. Please try again." };

  const cityGeo = await geocodeCity({
    city: loc.cityName,
    region: loc.regionName || undefined,
    country: loc.countryCode,
  });
  if (!cityGeo) {
    return { error: "We couldn't find that city. Please check the spelling or try a nearby larger town." };
  }

  let exactLat: number | null = null;
  let exactLng: number | null = null;

  if (data.clubVenuePublic && data.venueAddressLine) {
    const venueGeo = await geocodeAddress({
      addressLine: data.venueAddressLine,
      city: loc.cityName,
      region: loc.regionName || undefined,
      postalCode: data.venuePostalCode || undefined,
      country: loc.countryCode,
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
      city_id: data.city_id,
      region_id: data.region_id ?? null,
      country_id: data.country_id,
      city: cityGeo.city || loc.cityName,
      region: loc.regionName || cityGeo.region || null,
      country: cityGeo.country || loc.countryCode,
      bio: data.bio || null,
      socials: data.socials || {},
      lat: cityGeo.lat,
      lng: cityGeo.lng,
      exact_lat: exactLat,
      exact_lng: exactLng,
      club_meeting_info: data.clubMeetingInfo,
      club_venue_public: data.clubVenuePublic,
      contact_name: data.contactName,
      age_band: null,
      address_line: null,
      postal_code: null,
      hours: null,
      verified_owner: false,
    },
  };
}
