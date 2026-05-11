import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { geocodeCity, geocodeAddress, jitterCoords } from '@/lib/geocode';
import { sendReminderForEntry } from '@/lib/reminders';
import { sendLocationConfirmEmail } from '@/lib/email';
import { generateToken } from '@/lib/tokens';
import { logAudit, getClientIp } from '@/lib/rate-limit';
import { revalidateEntryLocations } from '@/lib/revalidate';

export const runtime = 'nodejs';

const locationStatusSchema = z.enum([
  'verified',
  'auto_geocoded',
  'needs_research',
  'awaiting_owner_response',
  'dead_pin',
]);
const LOCATION_CONFIRM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const OUTREACH_BATCH_SIZE = 20;

const singleActionSchema = z.object({
  action: z.enum(['flag_entry', 'unflag_entry', 'delete_entry', 'resolve_report', 'clear_auto_hide', 'regeocode_entry', 'send_reminder']),
  id: z.string().uuid(),
});

const bulkStatusSchema = z.object({
  action: z.literal('set_location_status'),
  ids: z.array(z.string().uuid()).min(1).max(500),
  locationStatus: locationStatusSchema,
});

const outreachSchema = z.object({
  action: z.literal('send_location_outreach'),
  ids: z.array(z.string().uuid()).min(1).max(500),
});

const schema = z.discriminatedUnion('action', [singleActionSchema, bulkStatusSchema, outreachSchema]);

function checkAdmin(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token') ?? '';
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!token || !expected) return false;
  const ta = Buffer.from(token);
  const tb = Buffer.from(expected);
  const len = Math.max(ta.length, tb.length);
  const a = Buffer.alloc(len);
  const b = Buffer.alloc(len);
  ta.copy(a);
  tb.copy(b);
  return crypto.timingSafeEqual(a, b) && ta.length === tb.length;
}

type OutreachEntry = {
  id: string;
  email: string;
  display_name: string;
  city: string;
  region: string | null;
  country: string;
};

type OutreachResult =
  | { status: 'sent' | 'queued' }
  | { status: 'failed'; entryId: string };

async function sendOutreachForEntry(
  supabase: ReturnType<typeof createAdminClient>,
  entry: OutreachEntry,
  expiresAt: string
): Promise<OutreachResult> {
  const token = generateToken();
  const { error: tokenError } = await supabase.from('verification_tokens').insert({
    entry_id: entry.id,
    token,
    purpose: 'location_confirm',
    expires_at: expiresAt,
  });
  if (tokenError) {
    return { status: 'failed', entryId: entry.id };
  }

  const outcome = await sendLocationConfirmEmail(
    entry.email,
    entry.display_name,
    token,
    entry.city,
    entry.region,
    entry.country
  );
  if (outcome.status === 'sent' || outcome.status === 'deduped') {
    return { status: 'sent' };
  }
  if (outcome.status === 'queued') {
    return { status: 'queued' };
  }
  return { status: 'failed', entryId: entry.id };
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

  const supabase = createAdminClient();
  const action = parsed.data.action;
  const ip = getClientIp(req.headers);

  if (action === 'set_location_status') {
    const { ids, locationStatus } = parsed.data;
    const { error } = await supabase
      .from('entries')
      .update({ location_status: locationStatus })
      .in('id', ids)
      .is('deleted_at', null);
    if (error) return NextResponse.json({ error: 'Bulk location status update failed.' }, { status: 500 });
    await logAudit('admin.set_location_status_bulk', {
      actor: 'admin',
      meta: { ip, idsCount: ids.length, locationStatus },
    });
    return NextResponse.json({ ok: true, updated: ids.length });
  }

  if (action === 'send_location_outreach') {
    const ids = parsed.data.ids;
    const { data: entries, error } = await supabase
      .from('entries')
      .select('id, email, display_name, city, region, country')
      .in('id', ids)
      .is('deleted_at', null);
    if (error) return NextResponse.json({ error: 'Could not load entries for outreach.' }, { status: 500 });

    let sent = 0;
    let queued = 0;
    let failed = 0;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOCATION_CONFIRM_TOKEN_TTL_MS).toISOString();

    const failedEntryIds: string[] = [];
    const allEntries = entries ?? [];
    for (let i = 0; i < allEntries.length; i += OUTREACH_BATCH_SIZE) {
      const batch = allEntries.slice(i, i + OUTREACH_BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((entry) => sendOutreachForEntry(supabase, entry, expiresAt))
      );

      for (const result of batchResults) {
        if (result.status === 'rejected') {
          failed += 1;
          continue;
        }
        if (result.value.status === 'sent') {
          sent += 1;
        } else if (result.value.status === 'queued') {
          queued += 1;
        } else if (result.value.status === 'failed') {
          failed += 1;
          failedEntryIds.push(result.value.entryId);
        }
      }
    }

    await supabase
      .from('entries')
      .update({ location_status: 'awaiting_owner_response' })
      .in('id', ids)
      .is('deleted_at', null);

    await logAudit('admin.send_location_outreach_bulk', {
      actor: 'admin',
      meta: { ip, idsCount: ids.length, sent, queued, failed, failedEntryIds },
    });

    return NextResponse.json({ ok: true, sent, queued, failed });
  }

  const { id } = parsed.data;

  // Snapshot location up front so we can bust caches after the action.
  // Only the visibility-changing actions need this; others fetch lazily.
  let entryLoc: { country: string | null; region: string | null; city: string | null } | null = null;
  if (['flag_entry', 'unflag_entry', 'delete_entry', 'clear_auto_hide'].includes(action)) {
    const { data } = await supabase
      .from('entries')
      .select('country, region, city')
      .eq('id', id)
      .maybeSingle();
    entryLoc = data ?? null;
  }

  switch (action) {
    case 'flag_entry':
      await supabase.from('entries').update({ is_flagged: true, is_visible: false }).eq('id', id);
      await logAudit('admin.flag_entry', { actor: 'admin', targetId: id, meta: { ip } });
      if (entryLoc) revalidateEntryLocations(entryLoc);
      break;
    case 'unflag_entry':
      await supabase.from('entries').update({ is_flagged: false, is_visible: true }).eq('id', id);
      await logAudit('admin.unflag_entry', { actor: 'admin', targetId: id, meta: { ip } });
      if (entryLoc) revalidateEntryLocations(entryLoc);
      break;
    case 'delete_entry': {
      const { data: entry } = await supabase.from('entries').select('parent_consent_id').eq('id', id).maybeSingle();
      await supabase.from('entries').delete().eq('id', id);
      if (entry?.parent_consent_id) {
        await supabase.from('parent_consents').delete().eq('id', entry.parent_consent_id);
      }
      await logAudit('admin.delete_entry', { actor: 'admin', targetId: id, meta: { ip } });
      if (entryLoc) revalidateEntryLocations(entryLoc);
      break;
    }
    case 'resolve_report':
      await supabase.from('reports').update({
        resolved_at: new Date().toISOString(),
        resolution: 'resolved_by_admin',
      }).eq('id', id);
      await logAudit('admin.resolve_report', { actor: 'admin', targetId: id, meta: { ip } });
      break;
    case 'clear_auto_hide':
      // Clear the auto_hidden_by_reports flag, making the entry visible again
      await supabase.from('entries').update({ auto_hidden_by_reports: false }).eq('id', id);
      await logAudit('admin.clear_auto_hide', { actor: 'admin', targetId: id, meta: { ip } });
      if (entryLoc) revalidateEntryLocations(entryLoc);
      break;
    case 'regeocode_entry': {
      const { data: entry } = await supabase
        .from('entries')
        .select('entity_type, city, region, country, address_line, postal_code, club_venue_public')
        .eq('id', id)
        .maybeSingle();
      if (!entry) {
        return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });
      }


      const updates: Record<string, number> = {};

      // Shops: re-geocode the street address for exact coords.
      if (entry.entity_type === 'shop' && entry.address_line) {
        const exactGeo = await geocodeAddress({
          addressLine: entry.address_line,
          city: entry.city,
          region: entry.region || undefined,
          postalCode: entry.postal_code || undefined,
          country: entry.country,
        });
        if (!exactGeo) {
          return NextResponse.json({ error: "Couldn't locate that address." }, { status: 400 });
        }
        updates.exact_lat = exactGeo.lat;
        updates.exact_lng = exactGeo.lng;
      }

      // All entity types need a city-level map pin. Apply jitter for persons
      // and private-venue clubs to protect their location privacy. Shops and
      // public-venue clubs show an intentional exact address, so no jitter.
      const cityGeo = await geocodeCity({
        city: entry.city,
        region: entry.region || undefined,
        country: entry.country,
      });
      if (!cityGeo) {
        return NextResponse.json({ error: "Couldn't locate that city." }, { status: 400 });
      }
      const needsJitter =
        entry.entity_type === 'person' ||
        (entry.entity_type === 'club' && !entry.club_venue_public);
      const coords = needsJitter ? jitterCoords(cityGeo.lat, cityGeo.lng) : cityGeo;
      updates.lat = coords.lat;
      updates.lng = coords.lng;

      const { error: updErr } = await supabase.from('entries').update(updates).eq('id', id);
      if (updErr) {
        return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
      }
      await logAudit('admin.regeocode_entry', { actor: 'admin', targetId: id, meta: { ip } });
      break;
    }
    case 'send_reminder': {
      // Admin manual send — bypass the rate-limit gates.
      const result = await sendReminderForEntry(supabase, id, { force: true });
      if (!result.ok) {
        return NextResponse.json({ error: `Reminder not sent: ${result.reason}` }, { status: 400 });
      }
      await logAudit('admin.send_reminder', { actor: 'admin', targetId: id, meta: { ip } });
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
