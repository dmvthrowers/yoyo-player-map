import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiError, withErrorHandling } from '@/lib/api-error';
import { checkRateLimit, getClientIp, logAudit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

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
