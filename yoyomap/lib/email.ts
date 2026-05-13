import { Resend } from 'resend';
import { createAdminClient } from './supabase/admin';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM || 'DMV Throwers YoYo Map <noreply@dmvthrowers.club>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://map.dmvthrowers.club';

// =============================================================================
// Outcome + error classification
// =============================================================================
// Resend's SDK returns { data, error } rather than throwing. A 429 can mean
// either the per-second throttle (~10 req/s) or the free-tier daily cap. We
// distinguish by message text ("daily" / "quota") so callers can tell the user
// whether to retry in seconds or tomorrow.
// =============================================================================

export type EmailSendOutcome =
  | { status: 'sent' }
  | { status: 'deduped' }
  | { status: 'queued'; kind: 'daily_quota' | 'throttled'; retryAt: string }
  | { status: 'failed'; error: string };

// Dedup windows per template (ms). A repeat send within this window is
// suppressed to protect Resend's 100/day free-tier cap. report_notification
// is intentionally omitted — every report should page the admin.
const DEDUP_WINDOW_MS: Partial<Record<QueuedEmail['template'], number>> = {
  entry_reminder: 60 * 60_000, // 1 hour — cron should never double-fire
  manage_entry: 60_000,        // 1 min — user-triggered magic link
  manage_entries: 60_000,      // 1 min — user-triggered multi-entry magic link
  location_confirm: 60 * 60_000,
};

async function shouldSkipAsDuplicate(toEmail: string, template: QueuedEmail['template']): Promise<boolean> {
  const windowMs = DEDUP_WINDOW_MS[template];
  if (!windowMs) return false;
  try {
    const supabase = createAdminClient();
    const cutoff = new Date(Date.now() - windowMs).toISOString();
    const { data } = await supabase
      .from('email_send_log')
      .select('last_sent_at')
      .eq('to_email', toEmail)
      .eq('template', template)
      .gte('last_sent_at', cutoff)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

async function recordSend(toEmail: string, template: QueuedEmail['template']): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from('email_send_log')
      .upsert(
        { to_email: toEmail, template, last_sent_at: new Date().toISOString() },
        { onConflict: 'to_email,template' }
      );
  } catch (e) {
    console.error('email_send_log upsert failed:', e);
  }
}

type ClassifiedError =
  | { kind: 'daily_quota'; retryAt: Date }
  | { kind: 'throttled'; retryAt: Date }
  | { kind: 'other'; error: string };

function classifyError(error: { name?: string; message?: string } | null | undefined): ClassifiedError {
  const name = error?.name ?? '';
  const msg = error?.message ?? '';
  if (name === 'rate_limit_exceeded') {
    if (/daily|quota/i.test(msg)) {
      return { kind: 'daily_quota', retryAt: nextUtcMidnight() };
    }
    return { kind: 'throttled', retryAt: new Date(Date.now() + 60_000) };
  }
  return { kind: 'other', error: `${name || 'unknown'}: ${msg || 'no detail'}` };
}

function nextUtcMidnight(): Date {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d;
}

// =============================================================================
// Queue payloads — one discriminated variant per email template. These are
// serialized to email_queue.payload (jsonb) and re-hydrated by the drain job.
// =============================================================================

export type ManageEntryItem = {
  displayName: string;
  token: string;
  entityType: 'person' | 'shop' | 'club';
};

export type QueuedEmail =
  | { template: 'entry_verify'; email: string; displayName: string; token: string }
  | { template: 'parent_consent'; parentEmail: string; parentName: string; minorDisplayName: string; token: string }
  | { template: 'entry_reminder'; email: string; displayName: string; token: string }
  | { template: 'manage_entry'; email: string; displayName: string; token: string }
  | { template: 'manage_entries'; email: string; entries: ManageEntryItem[] }
  | { template: 'location_confirm'; email: string; displayName: string; token: string; city: string; region: string | null; country: string }
  | { template: 'report_notification'; to: string; entryId: string; reason: string; details: string | null; reporterEmail: string | null; entryDisplayName: string | null };

interface RenderedEmail {
  to: string;
  subject: string;
  html: string;
}

function render(q: QueuedEmail): RenderedEmail {
  switch (q.template) {
    case 'entry_verify': {
      const link = `${APP_URL}/api/verify-parent?type=entry&token=${encodeURIComponent(q.token)}`;
      return {
        to: q.email,
        subject: 'Verify your YoYo Map entry',
        html: emailShell(
          'Verify your YoYo Map entry',
          `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi ${escapeHtml(q.displayName)},</h2>
           <p>Click the button below to confirm your email and publish your entry on the YoYo Map.</p>
           <p style="margin:20px 0;"><a href="${link}" style="background:#C8102E;color:#ffffff;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">Verify &amp; Publish</a></p>
           <p style="font-size:12px;color:#555;">Or paste this link into your browser:<br><span style="word-break:break-all;">${link}</span></p>
           <p style="font-size:12px;color:#555;">This link expires in 24 hours.</p>`
        ),
      };
    }
    case 'parent_consent': {
      const link = `${APP_URL}/api/verify-parent?type=consent&token=${encodeURIComponent(q.token)}`;
      return {
        to: q.parentEmail,
        subject: `Consent needed: ${q.minorDisplayName} wants to join YoYo Map`,
        html: emailShell(
          'Parent/guardian consent required',
          `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi ${escapeHtml(q.parentName)},</h2>
           <p><strong>${escapeHtml(q.minorDisplayName)}</strong> has asked to be listed on YoYo Map — a community directory that helps yo-yoers find each other.</p>
           <p>As the parent or legal guardian of a user under 18, we need your consent before we can publish their entry. Here's what will be visible publicly:</p>
           <ul>
             <li>Their chosen display name (not legal name unless they chose that)</li>
             <li>Their city and region (never exact address or GPS)</li>
             <li>An optional short bio and social media handles they entered</li>
             <li>An approximate map pin, blurred to a ~10 mile radius</li>
           </ul>
           <p>What we do NOT show publicly: email address, age, real name, or exact location.</p>
           <p>There is no messaging feature on the site. Other users cannot contact ${escapeHtml(q.minorDisplayName)} through the map.</p>
           <p>You can withdraw consent at any time by replying to this email or contacting dmvthrowers@gmail.com, and the entry will be removed.</p>
           <p style="margin:20px 0;"><a href="${link}" style="background:#C8102E;color:#ffffff;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">I Consent — Publish the Entry</a></p>
           <p style="font-size:12px;color:#555;">Or paste this link into your browser:<br><span style="word-break:break-all;">${link}</span></p>
           <p style="font-size:12px;color:#555;">This consent link expires in 7 days. If you do nothing, the entry will not be published.</p>
           <p style="font-size:12px;color:#555;">Full privacy policy: ${APP_URL}/legal/privacy</p>`
        ),
      };
    }
    case 'entry_reminder': {
      const link = `${APP_URL}/api/verify-parent?type=entry&token=${encodeURIComponent(q.token)}`;
      return {
        to: q.email,
        subject: 'Reminder: verify your YoYo Map entry',
        html: emailShell(
          'Reminder: verify your YoYo Map entry',
          `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi ${escapeHtml(q.displayName)},</h2>
           <p>Just a nudge — we have a YoYo Map entry waiting on your email confirmation. It won't appear on the map until you click verify.</p>
           <p style="margin:20px 0;"><a href="${link}" style="background:#C8102E;color:#ffffff;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">Verify &amp; Publish</a></p>
           <p style="font-size:12px;color:#555;">Or paste this link into your browser:<br><span style="word-break:break-all;">${link}</span></p>
           <p style="font-size:12px;color:#555;">This link expires in 24 hours. If you didn't sign up, you can ignore this email — your entry will be cleaned up automatically.</p>`
        ),
      };
    }
    case 'manage_entry': {
      const link = `${APP_URL}/profile?token=${encodeURIComponent(q.token)}`;
      return {
        to: q.email,
        subject: 'Manage your YoYo Map entry',
        html: emailShell(
          'Manage your YoYo Map entry',
          `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi ${escapeHtml(q.displayName)},</h2>
           <p>Click the link below to edit or delete your YoYo Map entry.</p>
           <p style="margin:20px 0;"><a href="${link}" style="background:#1a1f36;color:#F5F0E8;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">Manage My Entry</a></p>
           <p style="font-size:12px;color:#555;">Or paste this link into your browser:<br><span style="word-break:break-all;">${link}</span></p>
           <p style="font-size:12px;color:#555;">This link expires in 1 hour.</p>`
        ),
      };
    }
    case 'manage_entries': {
      const listHtml = q.entries.map((entry) => {
        const link = `${APP_URL}/profile?token=${encodeURIComponent(entry.token)}`;
        const label = entry.entityType === 'shop' ? 'Shop' : entry.entityType === 'club' ? 'Club' : 'Player';
        return `<li style="margin-bottom:16px;">
          <strong>${escapeHtml(entry.displayName)} (${escapeHtml(label)})</strong><br />
          <a href="${link}" style="color:#C8102E;text-decoration:none;font-weight:bold;">Manage this entry</a><br />
          <span style="font-size:12px;color:#555;word-break:break-all;">${link}</span>
        </li>`;
      }).join('');
      return {
        to: q.email,
        subject: 'Manage your YoYo Map entries',
        html: emailShell(
          'Manage your YoYo Map entries',
          `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi there,</h2>
           <p>You have multiple YoYo Map entries associated with this email address. Click any of the links below to edit or delete that entry.</p>
           <ul style="padding-left:18px;margin:20px 0;">${listHtml}</ul>
           <p style="font-size:12px;color:#555;">Each link expires in 1 hour.</p>`
        ),
      };
    }
    case 'location_confirm': {
      const link = `${APP_URL}/confirm-location/${encodeURIComponent(q.token)}`;
      const place = [q.city, q.region, q.country].filter(Boolean).join(', ');
      return {
        to: q.email,
        subject: 'Please confirm your city on YoYo Map',
        html: emailShell(
          'Confirm your city',
          `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi ${escapeHtml(q.displayName)},</h2>
           <p>We’re cleaning up map locations and need a quick confirmation for your entry.</p>
           <p><strong>Current city:</strong> ${escapeHtml(place)}</p>
           <p style="margin:20px 0;"><a href="${link}" style="background:#1a1f36;color:#F5F0E8;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">Confirm or Update City</a></p>
           <p style="font-size:12px;color:#555;">Or paste this link into your browser:<br><span style="word-break:break-all;">${link}</span></p>
           <p style="font-size:12px;color:#555;">This link expires in 7 days.</p>`
        ),
      };
    }
    case 'report_notification': {
      const adminLink = `${APP_URL}/admin`;
      return {
        to: q.to,
        subject: `[YoYo Map] Report: ${q.reason}`,
        html: emailShell(
          'New report submitted',
          `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">New report on YoYo Map</h2>
           <p><strong>Entry:</strong> ${escapeHtml(q.entryDisplayName || '(unknown)')} <span style="color:#777;">(${escapeHtml(q.entryId)})</span></p>
           <p><strong>Reason:</strong> ${escapeHtml(q.reason)}</p>
           ${q.details ? `<p><strong>Details:</strong><br>${escapeHtml(q.details)}</p>` : ''}
           <p><strong>Reporter:</strong> ${q.reporterEmail ? escapeHtml(q.reporterEmail) : '(anonymous)'}</p>
           <p style="margin:20px 0;"><a href="${adminLink}" style="background:#C8102E;color:#ffffff;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">Open Admin Dashboard</a></p>`
        ),
      };
    }
  }
}

// =============================================================================
// Core send: try Resend once; on 429, enqueue for later drain.
// =============================================================================

async function sendOrQueue(q: QueuedEmail): Promise<EmailSendOutcome> {
  const rendered = render(q);

  if (await shouldSkipAsDuplicate(rendered.to, q.template)) {
    return { status: 'deduped' };
  }

  let error: { name?: string; message?: string } | null = null;
  try {
    const result = await getResend().emails.send({
      from: FROM,
      to: rendered.to,
      subject: rendered.subject,
      html: rendered.html,
    });
    error = result.error ?? null;
  } catch (e) {
    error = { name: 'network_error', message: String(e) };
  }

  if (!error) {
    await recordSend(rendered.to, q.template);
    return { status: 'sent' };
  }

  const classified = classifyError(error);
  if (classified.kind === 'daily_quota' || classified.kind === 'throttled') {
    await enqueue(q, rendered.to, classified.retryAt, `${error.name}: ${error.message}`);
    return { status: 'queued', kind: classified.kind, retryAt: classified.retryAt.toISOString() };
  }

  console.error('Resend send failed:', classified.error);
  return { status: 'failed', error: classified.error };
}

async function enqueue(q: QueuedEmail, toEmail: string, notBefore: Date, lastError: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('email_queue').insert({
    template: q.template,
    to_email: toEmail,
    payload: q,
    not_before: notBefore.toISOString(),
    last_error: lastError,
  });
  if (error) {
    console.error('Failed to enqueue email for retry:', error);
  }
}

// =============================================================================
// Drain: called by cron after UTC reset. Processes up to `limit` rows, marks
// sent_at on success or increments attempts + updates last_error on failure.
// A row that hits another 429 is left queued (drain will pick it up next run).
// =============================================================================

export interface DrainSummary {
  processed: number;
  sent: number;
  requeued: number;
  failed: number;
}

export async function drainEmailQueue(limit = 100): Promise<DrainSummary> {
  const supabase = createAdminClient();
  const summary: DrainSummary = { processed: 0, sent: 0, requeued: 0, failed: 0 };

  const nowIso = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from('email_queue')
    .select('id, payload, attempts')
    .is('sent_at', null)
    .lte('not_before', nowIso)
    .order('not_before', { ascending: true })
    .limit(limit);

  if (error || !rows) {
    console.error('Drain query failed:', error);
    return summary;
  }

  for (const row of rows) {
    summary.processed += 1;
    const outcome = await sendOrQueue(row.payload as QueuedEmail);

    if (outcome.status === 'sent') {
      await supabase.from('email_queue').update({ sent_at: new Date().toISOString() }).eq('id', row.id);
      summary.sent += 1;
    } else if (outcome.status === 'queued') {
      // sendOrQueue inserted a NEW queue row for this retry. Delete the old one
      // so we don't pile up duplicates across drain runs.
      await supabase.from('email_queue').delete().eq('id', row.id);
      summary.requeued += 1;
    } else if (outcome.status === 'deduped') {
      // A fresher send for this (to_email, template) already went out — drop
      // this queued row rather than attempting again.
      await supabase.from('email_queue').delete().eq('id', row.id);
      summary.sent += 1;
    } else {
      await supabase.from('email_queue').update({
        attempts: (row.attempts ?? 0) + 1,
        last_error: outcome.error,
      }).eq('id', row.id);
      summary.failed += 1;
    }
  }

  return summary;
}

// =============================================================================
// Public helpers — same names as before, now return EmailSendOutcome.
// =============================================================================

export async function sendEntryVerificationEmail(
  email: string,
  displayName: string,
  token: string
): Promise<EmailSendOutcome> {
  return sendOrQueue({ template: 'entry_verify', email, displayName, token });
}

export async function sendParentConsentEmail(
  parentEmail: string,
  parentName: string,
  minorDisplayName: string,
  token: string
): Promise<EmailSendOutcome> {
  return sendOrQueue({ template: 'parent_consent', parentEmail, parentName, minorDisplayName, token });
}

export async function sendEntryReminderEmail(
  email: string,
  displayName: string,
  token: string
): Promise<EmailSendOutcome> {
  return sendOrQueue({ template: 'entry_reminder', email, displayName, token });
}

export async function sendManageEntryEmail(
  email: string,
  displayName: string,
  token: string
): Promise<EmailSendOutcome> {
  return sendOrQueue({ template: 'manage_entry', email, displayName, token });
}

export async function sendManageEntriesEmail(
  email: string,
  entries: ManageEntryItem[]
): Promise<EmailSendOutcome> {
  return sendOrQueue({ template: 'manage_entries', email, entries });
}

export async function sendLocationConfirmEmail(
  email: string,
  displayName: string,
  token: string,
  city: string,
  region: string | null,
  country: string
): Promise<EmailSendOutcome> {
  return sendOrQueue({ template: 'location_confirm', email, displayName, token, city, region, country });
}

export async function sendReportNotificationEmail(
  entryId: string,
  reason: string,
  details: string | null,
  reporterEmail: string | null,
  entryDisplayName: string | null
): Promise<EmailSendOutcome> {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL || 'dmvthrowers@gmail.com';
  return sendOrQueue({ template: 'report_notification', to, entryId, reason, details, reporterEmail, entryDisplayName });
}

// =============================================================================
// Template helpers
// =============================================================================

function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,Helvetica,sans-serif;color:#1a1f36;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:24px 12px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid rgba(26,31,54,0.1);">
        <tr><td style="background:#1a1f36;padding:16px 24px;border-bottom:4px solid #C8102E;">
          <p style="margin:0;color:#F5F0E8;font-size:20px;font-weight:900;letter-spacing:1px;">YoYo <span style="color:#C8102E;">Map</span></p>
        </td></tr>
        <tr><td style="padding:28px 24px;font-size:15px;line-height:1.55;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="background:#0d1021;color:#F5F0E8;padding:16px 24px;font-size:11px;">
          <p style="margin:0 0 4px 0;">DMV Throwers Yo-Yo &amp; Skill Toy Club · EIN 41-4879324</p>
          <p style="margin:0;">If you did not request this email, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
