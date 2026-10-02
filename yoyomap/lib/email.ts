import { Resend } from 'resend';
import { after } from 'next/server';
import { createAdminClient } from './supabase/admin';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM || 'DMV Throwers YoYo Map <noreply@dmvthrowers.club>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://map.dmvthrowers.club';

// =============================================================================
// Outcomes, priority, and the daily budget
// =============================================================================
// Resend's free tier allows 100 emails per UTC day and resets at 00:00 UTC.
// The quota is per Resend account, which this app shares with the VSYC
// registration app, and inbound mail counts too. Every send response carries
// x-resend-daily-quota (the account's usage so far today), so
// email_daily_usage tracks the higher of that and our own count.
//
// EMAIL_DAILY_LIMIT defaults to 90, leaving 10 as a buffer for inbound mail
// and the other app's sends we haven't seen yet. EMAIL_PRIORITY_RESERVE of
// those are held back for emails a person is waiting on, so a bulk job can't
// spend the day before a new sign-up's verify link goes out. Resend's own 429
// stays the backstop.
// =============================================================================

export type EmailSendOutcome =
  | { status: 'sent' }
  | { status: 'deduped' }
  | { status: 'queued'; kind: 'daily_quota' | 'throttled'; retryAt: string }
  // Not sent and not queued: the email would be useless by the time the limit
  // resets (its link expires first), or it's a reminder the cron re-sends on
  // its own schedule. The caller should tell the person to try again later.
  | { status: 'deferred'; retryAt: string }
  | { status: 'failed'; error: string };

type Template = QueuedEmail['template'];

// 0 = a person is waiting on it, 1 = admin alert, 2 = bulk. Only priority 2
// is held back by the reserve, and the drain sends lower numbers first.
const PRIORITY: Record<Template, 0 | 1 | 2> = {
  entry_verify: 0,
  parent_consent: 0,
  manage_entry: 0,
  manage_entries: 0,
  report_notification: 1,
  entry_reminder: 2,
  location_confirm: 2,
};

// How long a queued email stays worth sending: its link's token lifetime.
// The drain drops older rows instead of spending quota on a dead link.
const HOUR_MS = 60 * 60_000;
const MAX_QUEUE_AGE_MS: Partial<Record<Template, number>> = {
  entry_verify: 24 * HOUR_MS,
  parent_consent: 7 * 24 * HOUR_MS,
  entry_reminder: 24 * HOUR_MS,
  manage_entry: HOUR_MS,
  manage_entries: HOUR_MS,
  location_confirm: 7 * 24 * HOUR_MS,
};

// Retries for throttling, 5xx and network errors. Quota waits don't count.
const MAX_ATTEMPTS = 5;

function intEnv(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const DAILY_LIMIT = intEnv('EMAIL_DAILY_LIMIT', 90);
const PRIORITY_RESERVE = intEnv('EMAIL_PRIORITY_RESERVE', 30);

function budgetCap(template: Template): number {
  return PRIORITY[template] === 2 ? DAILY_LIMIT - PRIORITY_RESERVE : DAILY_LIMIT;
}

async function sentToday(): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('email_daily_usage')
      .select('sent')
      .eq('day', new Date().toISOString().slice(0, 10))
      .maybeSingle();
    return data?.sent ?? 0;
  } catch {
    // Fail open: Resend's own quota error still stops us.
    return 0;
  }
}

// Dedup windows per template (ms). A repeat send within this window is
// suppressed to protect Resend's 100/day free-tier cap. report_notification
// is intentionally omitted — every report should page the admin.
const DEDUP_WINDOW_MS: Partial<Record<Template, number>> = {
  entry_reminder: 60 * 60_000, // 1 hour — cron should never double-fire
  manage_entry: 60_000,        // 1 min — user-triggered magic link
  manage_entries: 60_000,      // 1 min — user-triggered multi-entry magic link
  location_confirm: 60 * 60_000,
};

async function shouldSkipAsDuplicate(toEmail: string, template: Template): Promise<boolean> {
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

/**
 * Log a delivered email. `quotaUsed` is Resend's account-wide count from the
 * response header; without it we add one to our own count.
 */
async function recordSend(toEmail: string, template: Template, quotaUsed: number | null): Promise<void> {
  try {
    const supabase = createAdminClient();
    await Promise.all([
      supabase
        .from('email_send_log')
        .upsert(
          { to_email: toEmail, template, last_sent_at: new Date().toISOString() },
          { onConflict: 'to_email,template' }
        ),
      quotaUsed === null
        ? supabase.rpc('record_email_send', { p_count: 1 })
        : supabase.rpc('observe_email_usage', { p_used: quotaUsed }),
    ]);
  } catch (e) {
    console.error('email send bookkeeping failed:', e);
  }
}

// =============================================================================
// One send attempt + error classification
// =============================================================================
// Resend's SDK returns { data, error } rather than throwing. The daily and
// monthly caps come back as their own error names; older responses used
// rate_limit_exceeded with "daily"/"quota" in the message, so we accept both.
// =============================================================================

type SendResult =
  | { kind: 'sent'; quotaUsed: number | null }
  | { kind: 'quota'; retryAt: Date; error: string } // daily/monthly cap
  | { kind: 'retry'; error: string }                // throttle, 5xx, network
  | { kind: 'failed'; error: string };              // retrying won't help

type ResendError = { name?: string; message?: string; statusCode?: number | null };

const TRANSIENT_ERRORS = new Set([
  'rate_limit_exceeded',
  'application_error',
  'internal_server_error',
  'concurrent_idempotent_requests',
  'network_error',
]);

function classifyError(error: ResendError): Exclude<SendResult, { kind: 'sent' }> {
  const name = error.name ?? 'unknown';
  const detail = `${name}: ${error.message || 'no detail'}`;
  if (name === 'daily_quota_exceeded' || (name === 'rate_limit_exceeded' && /daily|quota/i.test(error.message ?? ''))) {
    return { kind: 'quota', retryAt: nextUtcMidnight(), error: detail };
  }
  if (name === 'monthly_quota_exceeded') {
    return { kind: 'quota', retryAt: nextUtcMonth(), error: detail };
  }
  if (TRANSIENT_ERRORS.has(name) || (error.statusCode ?? 0) >= 500) {
    return { kind: 'retry', error: detail };
  }
  return { kind: 'failed', error: detail };
}

function nextUtcMidnight(): Date {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d;
}

function nextUtcMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

/** Backoff before retry number `attempts + 1`: 1, 2, 4, 8 … minutes, capped at 1 hour. */
function retryDelayMs(attempts: number): number {
  return Math.min(60_000 * 2 ** attempts, HOUR_MS);
}

/** Resend's x-resend-daily-quota header: emails the whole account has used today. */
function dailyQuotaUsed(headers: Record<string, string> | null): number | null {
  if (!headers) return null;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === 'x-resend-daily-quota');
  const n = key ? Number.parseInt(headers[key], 10) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function attemptSend(r: RenderedEmail): Promise<SendResult> {
  // One quick in-place retry for the per-second throttle, which clears in
  // about a second; anything longer goes through the queue.
  for (let attempt = 0; ; attempt++) {
    let error: ResendError | null = null;
    let headers: Record<string, string> | null = null;
    try {
      const result = await getResend().emails.send({
        from: FROM,
        to: r.to,
        subject: r.subject,
        html: r.html,
      });
      error = result.error ?? null;
      headers = result.headers ?? null;
    } catch (e) {
      error = { name: 'network_error', message: String(e) };
    }
    if (!error) return { kind: 'sent', quotaUsed: dailyQuotaUsed(headers) };

    const classified = classifyError(error);
    if (attempt === 0 && error.name === 'rate_limit_exceeded' && classified.kind === 'retry') {
      await new Promise((resolve) => setTimeout(resolve, 1100));
      continue;
    }
    return classified;
  }
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
           <p>You can withdraw consent at any time by replying to this email or contacting contact@dmvthrowers.club, and the entry will be removed.</p>
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
// Core send: try Resend now; on a quota or transient error, queue for drain.
// =============================================================================

async function sendOrQueue(q: QueuedEmail): Promise<EmailSendOutcome> {
  const rendered = render(q);

  if (await shouldSkipAsDuplicate(rendered.to, q.template)) {
    return { status: 'deduped' };
  }

  if ((await sentToday()) >= budgetCap(q.template)) {
    return holdUntil(q, rendered.to, nextUtcMidnight(), 'daily budget reached');
  }

  const result = await attemptSend(rendered);
  switch (result.kind) {
    case 'sent':
      await recordSend(rendered.to, q.template, result.quotaUsed);
      kickDrain();
      return { status: 'sent' };
    case 'quota':
      return holdUntil(q, rendered.to, result.retryAt, result.error);
    case 'retry': {
      const retryAt = new Date(Date.now() + retryDelayMs(0));
      await enqueue(q, rendered.to, retryAt, result.error, 1);
      return { status: 'queued', kind: 'throttled', retryAt: retryAt.toISOString() };
    }
    case 'failed':
      console.error('Resend send failed:', result.error);
      return { status: 'failed', error: result.error };
  }
}

/**
 * Hold an email until the daily limit resets. Reminders aren't queued (the
 * cron sends a fresh one next run), and neither is anything whose link would
 * expire before then.
 */
async function holdUntil(q: QueuedEmail, toEmail: string, retryAt: Date, reason: string): Promise<EmailSendOutcome> {
  const maxAge = MAX_QUEUE_AGE_MS[q.template];
  if (q.template === 'entry_reminder' || (maxAge !== undefined && retryAt.getTime() - Date.now() >= maxAge)) {
    return { status: 'deferred', retryAt: retryAt.toISOString() };
  }
  await enqueue(q, toEmail, retryAt, reason, 0);
  return { status: 'queued', kind: 'daily_quota', retryAt: retryAt.toISOString() };
}

async function enqueue(q: QueuedEmail, toEmail: string, notBefore: Date, lastError: string, attempts: number): Promise<void> {
  const maxAge = MAX_QUEUE_AGE_MS[q.template];
  const supabase = createAdminClient();
  const { error } = await supabase.from('email_queue').insert({
    template: q.template,
    to_email: toEmail,
    payload: q,
    priority: PRIORITY[q.template],
    not_before: notBefore.toISOString(),
    expires_at: maxAge === undefined ? null : new Date(Date.now() + maxAge).toISOString(),
    attempts,
    last_error: lastError,
  });
  if (error) {
    console.error('Failed to enqueue email for retry:', error);
  }
}

/**
 * After a successful send, drain a few due rows once the response is out.
 * This is what gets throttled/transient retries out within minutes whenever
 * the site has traffic; the daily cron handles the post-midnight backlog.
 */
function kickDrain(): void {
  try {
    after(async () => {
      try {
        await drainEmailQueue(5);
      } catch (e) {
        console.error('Background email drain failed:', e);
      }
    });
  } catch {
    // Outside a request (scripts): the cron drain covers it.
  }
}

// =============================================================================
// Drain: claims due rows (one drain per row, even if two run at once) and
// sends them highest priority first. A row is retried in place: quota waits
// move not_before, transient errors back off and count toward MAX_ATTEMPTS,
// and permanent errors or expired links mark the row dead.
// =============================================================================

export interface DrainSummary {
  processed: number;
  sent: number;
  requeued: number;
  failed: number;
  dead: number;
}

type QueueRow = {
  id: string;
  payload: QueuedEmail;
  priority: number;
  attempts: number | null;
  expires_at: string | null;
};

// Resend allows 10 requests/second per account, shared with the registration
// app. Draining at 2/second per app leaves plenty of room for live sends.
const DRAIN_SEND_SPACING_MS = 500;

/**
 * @param timeBudgetMs stop starting new sends after this long; unprocessed
 *   rows are released for the next run so the function never times out
 *   holding claims.
 */
export async function drainEmailQueue(limit = 100, timeBudgetMs = 40_000): Promise<DrainSummary> {
  const supabase = createAdminClient();
  const deadline = Date.now() + timeBudgetMs;
  let lastSendAt = 0;
  const summary: DrainSummary = { processed: 0, sent: 0, requeued: 0, failed: 0, dead: 0 };

  const { data: rows, error } = await supabase.rpc('claim_email_queue', { p_limit: limit });
  if (error || !rows) {
    console.error('Drain claim failed:', error);
    return summary;
  }

  const release = (id: string, fields: Record<string, unknown>) =>
    supabase.from('email_queue').update({ ...fields, claimed_at: null }).eq('id', id);
  const markDead = (id: string, reason: string) =>
    supabase.from('email_queue').update({ dead_at: new Date().toISOString(), last_error: reason }).eq('id', id);

  let used = await sentToday();
  // Once Resend says the cap is hit, stop calling it for the rest of the batch.
  let quotaUntil: Date | null = null;

  for (const row of rows as QueueRow[]) {
    const q = row.payload;
    if (Date.now() >= deadline) {
      await release(row.id, {});
      continue;
    }
    try {
      if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
        await markDead(row.id, 'expired: link no longer valid');
        summary.dead += 1;
        continue;
      }

      const blockedUntil = quotaUntil ?? (used >= budgetCap(q.template) ? nextUtcMidnight() : null);
      if (blockedUntil) {
        await release(row.id, { not_before: blockedUntil.toISOString() });
        summary.requeued += 1;
        continue;
      }

      summary.processed += 1;
      const rendered = render(q);
      if (await shouldSkipAsDuplicate(rendered.to, q.template)) {
        // A fresher send for this (to_email, template) already went out.
        await markDead(row.id, 'deduped: newer send already delivered');
        summary.sent += 1;
        continue;
      }

      const wait = lastSendAt + DRAIN_SEND_SPACING_MS - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      lastSendAt = Date.now();

      const result = await attemptSend(rendered);
      if (result.kind === 'sent') {
        await supabase.from('email_queue').update({ sent_at: new Date().toISOString() }).eq('id', row.id);
        await recordSend(rendered.to, q.template, result.quotaUsed);
        used = result.quotaUsed ?? used + 1;
        summary.sent += 1;
      } else if (result.kind === 'quota') {
        quotaUntil = result.retryAt;
        await release(row.id, { not_before: result.retryAt.toISOString(), last_error: result.error });
        summary.requeued += 1;
      } else if (result.kind === 'retry') {
        const attempts = (row.attempts ?? 0) + 1;
        if (attempts >= MAX_ATTEMPTS) {
          await supabase.from('email_queue')
            .update({ attempts, dead_at: new Date().toISOString(), last_error: result.error })
            .eq('id', row.id);
          summary.dead += 1;
        } else {
          await release(row.id, {
            attempts,
            not_before: new Date(Date.now() + retryDelayMs(attempts)).toISOString(),
            last_error: result.error,
          });
          summary.requeued += 1;
        }
      } else {
        await supabase.from('email_queue')
          .update({ attempts: (row.attempts ?? 0) + 1, dead_at: new Date().toISOString(), last_error: result.error })
          .eq('id', row.id);
        summary.failed += 1;
      }
    } catch (e) {
      // Leave the row for the next drain rather than holding the claim.
      console.error('Drain row failed:', row.id, e);
      await release(row.id, {});
    }
  }

  // Keep 30 days of finished rows for debugging.
  const cutoff = new Date(Date.now() - 30 * 24 * HOUR_MS).toISOString();
  await supabase
    .from('email_queue')
    .delete()
    .lt('created_at', cutoff)
    .or('sent_at.not.is.null,dead_at.not.is.null');

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
  const to = process.env.ADMIN_NOTIFICATION_EMAIL || 'contact@dmvthrowers.club';
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
