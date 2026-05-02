import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiError, withErrorHandling } from '@/lib/api-error';
import { checkRateLimit, getClientIp, logAudit } from '@/lib/rate-limit';
import { slugify } from '@/lib/locationSlug';

export const runtime = 'nodejs';

const COUNTRY_SEED = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'BE', name: 'Belgium' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'PL', name: 'Poland' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'PH', name: 'Philippines' },
  { code: 'IN', name: 'India' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'HN', name: 'Honduras' },
];

const COUNTRY_LOOKUP = new Map<string, { code: string; name: string }>([
  ['us', { code: 'US', name: 'United States' }],
  ['usa', { code: 'US', name: 'United States' }],
  ['united-states', { code: 'US', name: 'United States' }],
  ['ca', { code: 'CA', name: 'Canada' }],
  ['canada', { code: 'CA', name: 'Canada' }],
  ['uk', { code: 'GB', name: 'United Kingdom' }],
  ['gb', { code: 'GB', name: 'United Kingdom' }],
  ['united-kingdom', { code: 'GB', name: 'United Kingdom' }],
  ['mx', { code: 'MX', name: 'Mexico' }],
  ['mexico', { code: 'MX', name: 'Mexico' }],
  ['br', { code: 'BR', name: 'Brazil' }],
  ['brazil', { code: 'BR', name: 'Brazil' }],
  ['ar', { code: 'AR', name: 'Argentina' }],
  ['argentina', { code: 'AR', name: 'Argentina' }],
  ['cl', { code: 'CL', name: 'Chile' }],
  ['chile', { code: 'CL', name: 'Chile' }],
  ['co', { code: 'CO', name: 'Colombia' }],
  ['colombia', { code: 'CO', name: 'Colombia' }],
  ['de', { code: 'DE', name: 'Germany' }],
  ['germany', { code: 'DE', name: 'Germany' }],
  ['fr', { code: 'FR', name: 'France' }],
  ['france', { code: 'FR', name: 'France' }],
  ['es', { code: 'ES', name: 'Spain' }],
  ['spain', { code: 'ES', name: 'Spain' }],
  ['it', { code: 'IT', name: 'Italy' }],
  ['italy', { code: 'IT', name: 'Italy' }],
  ['be', { code: 'BE', name: 'Belgium' }],
  ['belgium', { code: 'BE', name: 'Belgium' }],
  ['nl', { code: 'NL', name: 'Netherlands' }],
  ['netherlands', { code: 'NL', name: 'Netherlands' }],
  ['cz', { code: 'CZ', name: 'Czech Republic' }],
  ['czech-republic', { code: 'CZ', name: 'Czech Republic' }],
  ['hu', { code: 'HU', name: 'Hungary' }],
  ['hungary', { code: 'HU', name: 'Hungary' }],
  ['pl', { code: 'PL', name: 'Poland' }],
  ['poland', { code: 'PL', name: 'Poland' }],
  ['ua', { code: 'UA', name: 'Ukraine' }],
  ['ukraine', { code: 'UA', name: 'Ukraine' }],
  ['jp', { code: 'JP', name: 'Japan' }],
  ['japan', { code: 'JP', name: 'Japan' }],
  ['kr', { code: 'KR', name: 'South Korea' }],
  ['south-korea', { code: 'KR', name: 'South Korea' }],
  ['cn', { code: 'CN', name: 'China' }],
  ['china', { code: 'CN', name: 'China' }],
  ['tw', { code: 'TW', name: 'Taiwan' }],
  ['taiwan', { code: 'TW', name: 'Taiwan' }],
  ['sg', { code: 'SG', name: 'Singapore' }],
  ['singapore', { code: 'SG', name: 'Singapore' }],
  ['ph', { code: 'PH', name: 'Philippines' }],
  ['philippines', { code: 'PH', name: 'Philippines' }],
  ['in', { code: 'IN', name: 'India' }],
  ['india', { code: 'IN', name: 'India' }],
  ['au', { code: 'AU', name: 'Australia' }],
  ['australia', { code: 'AU', name: 'Australia' }],
  ['nz', { code: 'NZ', name: 'New Zealand' }],
  ['new-zealand', { code: 'NZ', name: 'New Zealand' }],
  ['hn', { code: 'HN', name: 'Honduras' }],
  ['honduras', { code: 'HN', name: 'Honduras' }],
]);

function normalizeCountry(raw: string | null | undefined) {
  if (!raw) return null;
  return COUNTRY_LOOKUP.get(slugify(raw)) ?? null;
}

function normalizeRegionCode(raw: string | null | undefined) {
  const value = raw?.trim();
  if (!value) return null;
  return value.toUpperCase().slice(0, 32);
}

function normalizeName(raw: string | null | undefined) {
  const value = raw?.trim();
  return value ? value.replace(/\s+/g, ' ') : null;
}

async function ensureLocationSeed(supabase: ReturnType<typeof createAdminClient>) {
  const { count, error } = await supabase
    .from('countries')
    .select('id', { count: 'exact', head: true });

  if (error) {
    throw error;
  }
  if ((count ?? 0) > 0) {
    return;
  }

  const { data: legacyEntries, error: legacyError } = await supabase
    .from('entries')
    .select('country, region, city');

  if (legacyError) {
    throw legacyError;
  }

  const countries = new Map<string, { code: string; name: string }>();
  for (const country of COUNTRY_SEED) {
    countries.set(country.code, country);
  }
  for (const entry of legacyEntries ?? []) {
    const normalized = normalizeCountry(entry.country);
    if (normalized) {
      countries.set(normalized.code, normalized);
    }
  }

  if (countries.size > 0) {
    const { error: insertCountriesError } = await supabase
      .from('countries')
      .upsert([...countries.values()], { onConflict: 'code' });
    if (insertCountriesError) {
      throw insertCountriesError;
    }
  }

  const { data: countryRows, error: countryRowsError } = await supabase
    .from('countries')
    .select('id, code');
  if (countryRowsError) {
    throw countryRowsError;
  }

  const countryIds = new Map((countryRows ?? []).map((row) => [row.code, row.id]));

  const regions = new Map<string, { country_id: number; code: string; name: string }>();
  const cities = new Map<string, { country_id: number; region_id: number | null; name: string }>();

  for (const entry of legacyEntries ?? []) {
    const country = normalizeCountry(entry.country);
    if (!country) continue;
    const countryId = countryIds.get(country.code);
    if (!countryId) continue;

    const regionName = normalizeName(entry.region);
    const regionCode = normalizeRegionCode(entry.region);
    let regionId: number | null = null;

    if (regionName && regionCode) {
      const regionKey = `${countryId}|${regionCode}`;
      regions.set(regionKey, { country_id: countryId, code: regionCode, name: regionName });
    }

    const cityName = normalizeName(entry.city);
    if (cityName) {
      const cityKey = `${countryId}|${regionCode ?? ''}|${cityName.toLowerCase()}`;
      cities.set(cityKey, { country_id: countryId, region_id: null, name: cityName });
    }
  }

  if (regions.size > 0) {
    const { error: insertRegionsError } = await supabase
      .from('regions')
      .upsert([...regions.values()], { onConflict: 'country_id,code' });
    if (insertRegionsError) {
      throw insertRegionsError;
    }
  }

  const { data: regionRows, error: regionRowsError } = await supabase
    .from('regions')
    .select('id, country_id, code');
  if (regionRowsError) {
    throw regionRowsError;
  }

  const regionIds = new Map((regionRows ?? []).map((row) => [`${row.country_id}|${row.code}`, row.id]));

  for (const entry of legacyEntries ?? []) {
    const country = normalizeCountry(entry.country);
    if (!country) continue;
    const countryId = countryIds.get(country.code);
    if (!countryId) continue;

    const cityName = normalizeName(entry.city);
    if (!cityName) continue;

    const regionCode = normalizeRegionCode(entry.region);
    const regionId = regionCode ? (regionIds.get(`${countryId}|${regionCode}`) ?? null) : null;
    const cityKey = `${countryId}|${regionId ?? ''}|${cityName.toLowerCase()}`;
    cities.set(cityKey, { country_id: countryId, region_id: regionId, name: cityName });
  }

  if (cities.size > 0) {
    const { error: insertCitiesError } = await supabase
      .from('cities')
      .upsert([...cities.values()], { onConflict: 'country_id,region_id,name' });
    if (insertCitiesError) {
      throw insertCitiesError;
    }
  }
}

const getQuerySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('countries') }),
  z.object({ type: z.literal('regions'), countryId: z.coerce.number().int().positive() }),
  z.object({
    type: z.literal('cities'),
    countryId: z.coerce.number().int().positive(),
    regionId: z.coerce.number().int().positive().optional(),
  }),
]);

const createCitySchema = z.object({
  name: z.string().trim().min(2).max(120),
  countryId: z.number().int().positive(),
  regionId: z.number().int().positive().nullable().optional(),
});

export const GET = withErrorHandling(async (requestId: string, req: NextRequest) => {
  const parsed = getQuerySchema.safeParse({
    type: req.nextUrl.searchParams.get('type'),
    countryId: req.nextUrl.searchParams.get('countryId') ?? undefined,
    regionId: req.nextUrl.searchParams.get('regionId') ?? undefined,
  });

  if (!parsed.success) {
    return apiError('bad_request', 'Invalid location query.', requestId);
  }

  const supabase = createAdminClient();
  await ensureLocationSeed(supabase);

  switch (parsed.data.type) {
    case 'countries': {
      const { data, error } = await supabase
        .from('countries')
        .select('id, code, name')
        .order('name');

      if (error) {
        console.error(`[api] countries query failed [${requestId}]:`, error);
        return apiError('upstream_error', 'Could not load countries.', requestId);
      }

      return NextResponse.json({ countries: data ?? [] });
    }

    case 'regions': {
      const { data, error } = await supabase
        .from('regions')
        .select('id, code, name')
        .eq('country_id', parsed.data.countryId)
        .order('name');

      if (error) {
        console.error(`[api] regions query failed [${requestId}]:`, error);
        return apiError('upstream_error', 'Could not load regions.', requestId);
      }

      return NextResponse.json({ regions: data ?? [] });
    }

    case 'cities': {
      let query = supabase
        .from('cities')
        .select('id, name')
        .eq('country_id', parsed.data.countryId);

      if (parsed.data.regionId) {
        query = query.eq('region_id', parsed.data.regionId);
      }

      const { data, error } = await query.order('name');

      if (error) {
        console.error(`[api] cities query failed [${requestId}]:`, error);
        return apiError('upstream_error', 'Could not load cities.', requestId);
      }

      return NextResponse.json({ cities: data ?? [] });
    }
  }
});

export const POST = withErrorHandling(async (requestId: string, req: NextRequest) => {
  const ip = getClientIp(req.headers);
  const allowed = await checkRateLimit(ip, 'locations.city_create', 10, 60);
  if (!allowed) {
    return apiError('rate_limited', 'Too many city additions. Please try again later.', requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('bad_request', 'Invalid request body.', requestId);
  }

  const parsed = createCitySchema.safeParse(body);
  if (!parsed.success) {
    return apiError('bad_request', parsed.error.errors[0]?.message || 'Invalid city.', requestId);
  }

  const { name, countryId, regionId } = parsed.data;
  const normalizedName = name.trim();
  const supabase = createAdminClient();

  let existingQuery = supabase
    .from('cities')
    .select('id, name')
    .eq('country_id', countryId)
    .ilike('name', normalizedName);

  if (regionId) {
    existingQuery = existingQuery.eq('region_id', regionId);
  } else {
    existingQuery = existingQuery.is('region_id', null);
  }

  const { data: existing, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) {
    console.error(`[api] city lookup failed [${requestId}]:`, existingError);
    return apiError('upstream_error', 'Could not check that city.', requestId);
  }

  if (existing) {
    return NextResponse.json({ city: existing });
  }

  const { data, error } = await supabase
    .from('cities')
    .insert({
      name: normalizedName,
      country_id: countryId,
      region_id: regionId ?? null,
    })
    .select('id, name')
    .single();

  if (error || !data) {
    console.error(`[api] city insert failed [${requestId}]:`, error);
    return apiError('upstream_error', 'Could not add that city right now.', requestId);
  }

  await logAudit('locations.city_create', {
    targetId: String(data.id),
    meta: { ip, countryId, regionId: regionId ?? null, name: normalizedName },
  });

  return NextResponse.json({ city: data }, { headers: { 'x-request-id': requestId } });
});
