import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { geocodeCity, geocodeAddress, jitterCoords } from '@/lib/geocode';
import { logAudit, getClientIp } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
// Bumped from the default (10s) because each entry hits Nominatim and we
// sleep 1s between to respect their rate-limit policy.
export const maxDuration = 60;

const BATCH_SIZE = 10;
const SLEEP_MS = 1100; // Nominatim usage policy: ≤1 req/sec.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Failure {
  id: string;
  display_name: string;
  city: string;
  reason: string;
}


export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const supabase = createAdminClient();
  const ip = getClientIp(req.headers);

  let force = false;
  try {
    const body = await req.json();
    if (body && body.force) force = true;
  } catch {}

  let query = supabase
    .from('entries')
    .select('id, display_name, entity_type, city, region, country, address_line, postal_code, club_venue_public')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);
  if (!force) {
    query = query.is('geocoded_at', null);
  }
  const { data: batch, error: qErr } = await query;

  if (qErr) {
    return NextResponse.json({ error: 'Query failed.' }, { status: 500 });
  }

  let countQuery = supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);
  if (!force) {
    countQuery = countQuery.is('geocoded_at', null);
  }
  const { count: remainingBefore } = await countQuery;

  let succeeded = 0;
  const failures: Failure[] = [];

  for (let i = 0; i < (batch?.length ?? 0); i++) {
    const entry = batch![i];
    if (i > 0) await sleep(SLEEP_MS);

    const updates: Record<string, unknown> = {};
    let entryFailed = false;
    let reason = '';

    // Shop exact coords — the address geocoder is already structured, so
    // wasn't affected by the county bug, but re-run for consistency.
    if (entry.entity_type === 'shop' && entry.address_line) {
      const exactGeo = await geocodeAddress({
        addressLine: entry.address_line,
        city: entry.city,
        region: entry.region || undefined,
        postalCode: entry.postal_code || undefined,
        country: entry.country,
      });
      if (exactGeo) {
        updates.exact_lat = exactGeo.lat;
        updates.exact_lng = exactGeo.lng;
      } else {
        entryFailed = true;
        reason = 'address_not_found';
      }
      await sleep(SLEEP_MS);
    }

    if (!entryFailed) {
      const cityGeo = await geocodeCity({
        city: entry.city,
        region: entry.region || undefined,
        country: entry.country,
      });
      if (cityGeo) {
        const needsJitter =
          entry.entity_type === 'person' ||
          (entry.entity_type === 'club' && !entry.club_venue_public);
        const coords = needsJitter ? jitterCoords(cityGeo.lat, cityGeo.lng) : cityGeo;
        updates.lat = coords.lat;
        updates.lng = coords.lng;
      } else {
        entryFailed = true;
        reason = 'city_not_found';
      }
    }

    if (entryFailed) {
      failures.push({
        id: entry.id,
        display_name: entry.display_name,
        city: `${entry.city}${entry.region ? ', ' + entry.region : ''}`,
        reason,
      });
      continue;
    }

    updates.geocoded_at = new Date().toISOString();
    const { error: upErr } = await supabase.from('entries').update(updates).eq('id', entry.id);
    if (upErr) {
      failures.push({
        id: entry.id,
        display_name: entry.display_name,
        city: entry.city,
        reason: 'db_update_failed',
      });
      continue;
    }
    succeeded += 1;
  }

  const { count: remainingAfter } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .is('geocoded_at', null)
    .is('deleted_at', null);

  const result = {
    ok: true,
    processed: batch?.length ?? 0,
    succeeded,
    failed: failures.length,
    failures,
    remaining: remainingAfter ?? 0,
    remainingBefore: remainingBefore ?? 0,
  };

  await logAudit('admin.regeocode_all_batch', {
    actor: 'admin',
    meta: { ip, processed: result.processed, succeeded, failed: result.failed },
  });

  return NextResponse.json(result);
}
