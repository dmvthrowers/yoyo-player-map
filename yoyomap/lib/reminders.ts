import { createAdminClient } from './supabase/admin';
import { sendEntryReminderEmail } from './email';
import { generateToken } from './tokens';

type AdminClient = ReturnType<typeof createAdminClient>;

export const MAX_REMINDERS_PER_ENTRY = 3;
export const MIN_HOURS_BETWEEN_REMINDERS = 20;

export type ReminderResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Send a single verification reminder to an entry owner. Gated by:
 *   - entry must be unverified + not soft-deleted
 *   - at most MAX_REMINDERS_PER_ENTRY total
 *   - at least MIN_HOURS_BETWEEN_REMINDERS since the last one
 *
 * Mints a fresh 24-hour email_verify token; old ones stay valid until expiry
 * but most clients will click the most recent email.
 */
export async function sendReminderForEntry(
  supabase: AdminClient,
  entryId: string,
  opts: { force?: boolean } = {}
): Promise<ReminderResult> {
  const { data: entry } = await supabase
    .from('entries')
    .select('id, email, display_name, verified_at, deleted_at, reminder_count, last_reminder_at')
    .eq('id', entryId)
    .maybeSingle();

  if (!entry) return { ok: false, reason: 'not_found' };
  if (entry.deleted_at) return { ok: false, reason: 'deleted' };
  if (entry.verified_at) return { ok: false, reason: 'already_verified' };

  if (!opts.force) {
    if ((entry.reminder_count ?? 0) >= MAX_REMINDERS_PER_ENTRY) {
      return { ok: false, reason: 'max_reminders_reached' };
    }
    if (entry.last_reminder_at) {
      const hoursSince = (Date.now() - new Date(entry.last_reminder_at).getTime()) / 3_600_000;
      if (hoursSince < MIN_HOURS_BETWEEN_REMINDERS) {
        return { ok: false, reason: 'too_soon' };
      }
    }
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error: tokenErr } = await supabase.from('verification_tokens').insert({
    entry_id: entry.id,
    token,
    purpose: 'email_verify',
    expires_at: expiresAt,
  });
  if (tokenErr) return { ok: false, reason: 'token_insert_failed' };

  try {
    await sendEntryReminderEmail(entry.email, entry.display_name, token);
  } catch (e) {
    console.error('Failed to send reminder email:', e);
    return { ok: false, reason: 'email_send_failed' };
  }

  await supabase
    .from('entries')
    .update({
      last_reminder_at: new Date().toISOString(),
      reminder_count: (entry.reminder_count ?? 0) + 1,
    })
    .eq('id', entry.id);

  return { ok: true };
}
