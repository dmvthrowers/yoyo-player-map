import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  sendReminderForEntry,
  MAX_REMINDERS_PER_ENTRY,
  MIN_HOURS_BETWEEN_REMINDERS,
} from '@/lib/reminders';
import { logAudit, getClientIp } from '@/lib/rate-limit';
import { requireAdminOrCron } from '@/lib/admin-auth';

export const runtime = 'nodejs';

/**
 * Bulk send reminders to unverified entries. Accepts:
 *   - Admin UI button: header `x-admin-token: $ADMIN_PASSWORD`
 *   - Vercel cron: header `Authorization: Bearer $CRON_SECRET`
 *
 * Gates (enforced inside sendReminderForEntry): reminder_count < MAX, and
 * at least MIN_HOURS_BETWEEN_REMINDERS since the last send.
 */

async function handle(req: NextRequest) {
  const authError = await requireAdminOrCron(req);
  if (authError) return authError;

  const supabase = createAdminClient();
  const ip = getClientIp(req.headers);

  // Pull candidates: unverified + not deleted + under the cap.
  // Server-side filter on reminder_count keeps the payload small; the
  // per-entry guard re-checks everything (including the time gate).
  const { data: candidates, error } = await supabase
    .from('entries')
    .select('id')
    .is('verified_at', null)
    .is('deleted_at', null)
    .lt('reminder_count', MAX_REMINDERS_PER_ENTRY)
    .order('last_reminder_at', { ascending: true, nullsFirst: true })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: 'Query failed.' }, { status: 500 });
  }

  const summary: {
    sent: number;
    skipped: Record<string, number>;
    total: number;
  } = { sent: 0, skipped: {}, total: candidates?.length ?? 0 };

  for (const c of candidates ?? []) {
    const result = await sendReminderForEntry(supabase, c.id);
    if (result.ok) {
      summary.sent += 1;
    } else {
      summary.skipped[result.reason] = (summary.skipped[result.reason] ?? 0) + 1;
    }
  }

  await logAudit('admin.send_reminders_bulk', {
    actor: 'admin',
    meta: { ip, ...summary, minHours: MIN_HOURS_BETWEEN_REMINDERS },
  });

  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
