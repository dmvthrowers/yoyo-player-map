import { Resend } from "resend";
import { db } from "@workspace/db";
import { emailSendLogTable, emailQueueTable } from "@workspace/db";
import { and, eq, gte } from "drizzle-orm";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  return new Resend(key);
}

const FROM =
  process.env.EMAIL_FROM || "DMV Throwers YoYo Map <noreply@dmvthrowers.club>";
const APP_URL =
  process.env.APP_URL ||
  (process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://map.dmvthrowers.club");

export type EmailSendOutcome =
  | { status: "sent" }
  | { status: "deduped" }
  | { status: "queued"; kind: "daily_quota" | "throttled"; retryAt: string }
  | { status: "failed"; error: string };

export type ManageEntryItem = {
  displayName: string;
  token: string;
  entityType: "person" | "shop" | "club";
};

export type QueuedEmail =
  | { template: "entry_verify"; email: string; displayName: string; token: string }
  | { template: "parent_consent"; parentEmail: string; parentName: string; minorDisplayName: string; token: string }
  | { template: "entry_reminder"; email: string; displayName: string; token: string }
  | { template: "manage_entry"; email: string; displayName: string; token: string }
  | { template: "manage_entries"; email: string; entries: ManageEntryItem[] }
  | { template: "report_notification"; to: string; entryId: string; reason: string; details: string | null; reporterEmail: string | null; entryDisplayName: string | null };

const DEDUP_WINDOW_MS: Partial<Record<QueuedEmail["template"], number>> = {
  entry_verify: 10 * 60_000,
  parent_consent: 10 * 60_000,
  entry_reminder: 60 * 60_000,
  manage_entry: 60_000,
  manage_entries: 60_000,
};

async function shouldSkipAsDuplicate(
  toEmail: string,
  template: QueuedEmail["template"],
): Promise<boolean> {
  const windowMs = DEDUP_WINDOW_MS[template];
  if (!windowMs) return false;
  try {
    const cutoff = new Date(Date.now() - windowMs);
    const rows = await db
      .select({ last_sent_at: emailSendLogTable.last_sent_at })
      .from(emailSendLogTable)
      .where(
        and(
          eq(emailSendLogTable.to_email, toEmail),
          eq(emailSendLogTable.template, template),
          gte(emailSendLogTable.last_sent_at, cutoff),
        ),
      )
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function recordSend(
  toEmail: string,
  template: QueuedEmail["template"],
): Promise<void> {
  try {
    await db
      .insert(emailSendLogTable)
      .values({ to_email: toEmail, template, last_sent_at: new Date() })
      .onConflictDoNothing();
  } catch (e) {
    console.error("email_send_log upsert failed:", e);
  }
}

type ClassifiedError =
  | { kind: "daily_quota"; retryAt: Date }
  | { kind: "throttled"; retryAt: Date }
  | { kind: "other"; error: string };

function classifyError(
  error: { name?: string; message?: string } | null | undefined,
): ClassifiedError {
  const name = error?.name ?? "";
  const msg = error?.message ?? "";
  if (name === "rate_limit_exceeded") {
    if (/daily|quota/i.test(msg)) {
      const d = new Date();
      d.setUTCHours(24, 0, 0, 0);
      return { kind: "daily_quota", retryAt: d };
    }
    return { kind: "throttled", retryAt: new Date(Date.now() + 60_000) };
  }
  return { kind: "other", error: `${name || "unknown"}: ${msg || "no detail"}` };
}

interface RenderedEmail {
  to: string;
  subject: string;
  html: string;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,Helvetica,sans-serif;color:#1a1f36;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:24px 12px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid rgba(26,31,54,0.1);">
        <tr><td style="background:#1a2744;padding:16px 24px;border-bottom:4px solid #D42B2B;">
          <p style="margin:0;color:#F5F0E8;font-size:20px;font-weight:900;letter-spacing:1px;">YoYo <span style="color:#D42B2B;">Map</span></p>
        </td></tr>
        <tr><td style="padding:28px 24px;font-size:15px;line-height:1.55;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="background:#0e1833;color:#F5F0E8;padding:16px 24px;font-size:11px;">
          <p style="margin:0 0 4px 0;">DMV Throwers Yo-Yo &amp; Skill Toy Club · EIN 41-4879324</p>
          <p style="margin:0;">If you did not request this email, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function render(q: QueuedEmail): RenderedEmail {
  switch (q.template) {
    case "entry_verify": {
      const link = `${APP_URL}/verify?type=entry&token=${encodeURIComponent(q.token)}`;
      return {
        to: q.email,
        subject: "Verify your YoYo Map entry",
        html: emailShell(
          "Verify your YoYo Map entry",
          `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi ${escapeHtml(q.displayName)},</h2>
           <p>Click the button below to confirm your email and publish your entry on the YoYo Map.</p>
           <p style="margin:20px 0;"><a href="${link}" style="background:#D42B2B;color:#ffffff;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">Verify &amp; Publish</a></p>
           <p style="font-size:12px;color:#555;">Or paste: <span style="word-break:break-all;">${link}</span></p>
           <p style="font-size:12px;color:#555;">This link expires in 24 hours.</p>`,
        ),
      };
    }
    case "parent_consent": {
      const link = `${APP_URL}/verify?type=consent&token=${encodeURIComponent(q.token)}`;
      return {
        to: q.parentEmail,
        subject: `Consent needed: ${q.minorDisplayName} wants to join YoYo Map`,
        html: emailShell(
          "Parent/guardian consent required",
          `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi ${escapeHtml(q.parentName)},</h2>
           <p><strong>${escapeHtml(q.minorDisplayName)}</strong> has asked to be listed on YoYo Map.</p>
           <p style="margin:20px 0;"><a href="${link}" style="background:#D42B2B;color:#ffffff;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">I Consent — Publish the Entry</a></p>
           <p style="font-size:12px;color:#555;">This consent link expires in 7 days.</p>`,
        ),
      };
    }
    case "entry_reminder": {
      const link = `${APP_URL}/verify?type=entry&token=${encodeURIComponent(q.token)}`;
      return {
        to: q.email,
        subject: "Reminder: verify your YoYo Map entry",
        html: emailShell(
          "Reminder: verify your YoYo Map entry",
          `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi ${escapeHtml(q.displayName)},</h2>
           <p>Your YoYo Map entry is waiting on email confirmation.</p>
           <p style="margin:20px 0;"><a href="${link}" style="background:#D42B2B;color:#ffffff;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">Verify &amp; Publish</a></p>
           <p style="font-size:12px;color:#555;">This link expires in 24 hours.</p>`,
        ),
      };
    }
    case "manage_entry": {
      const link = `${APP_URL}/profile?token=${encodeURIComponent(q.token)}`;
      return {
        to: q.email,
        subject: "Manage your YoYo Map entry",
        html: emailShell(
          "Manage your YoYo Map entry",
          `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi ${escapeHtml(q.displayName)},</h2>
           <p>Click the link below to edit or delete your YoYo Map entry.</p>
           <p style="margin:20px 0;"><a href="${link}" style="background:#1a2744;color:#F5F0E8;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">Manage My Entry</a></p>
           <p style="font-size:12px;color:#555;">This link expires in 1 hour.</p>`,
        ),
      };
    }
    case "manage_entries": {
      const listHtml = q.entries
        .map((entry) => {
          const link = `${APP_URL}/profile?token=${encodeURIComponent(entry.token)}`;
          const label =
            entry.entityType === "shop"
              ? "Shop"
              : entry.entityType === "club"
                ? "Club"
                : "Player";
          return `<li style="margin-bottom:16px;"><strong>${escapeHtml(entry.displayName)} (${label})</strong><br /><a href="${link}" style="color:#D42B2B;font-weight:bold;">Manage this entry</a></li>`;
        })
        .join("");
      return {
        to: q.email,
        subject: "Manage your YoYo Map entries",
        html: emailShell(
          "Manage your YoYo Map entries",
          `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi there,</h2>
           <p>You have multiple YoYo Map entries. Click any link below to manage that entry.</p>
           <ul style="padding-left:18px;margin:20px 0;">${listHtml}</ul>
           <p style="font-size:12px;color:#555;">Each link expires in 1 hour.</p>`,
        ),
      };
    }
    case "report_notification": {
      return {
        to: q.to,
        subject: `[YoYo Map] Report: ${q.reason}`,
        html: emailShell(
          "New report submitted",
          `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">New report on YoYo Map</h2>
           <p><strong>Entry:</strong> ${escapeHtml(q.entryDisplayName || "(unknown)")} (${escapeHtml(q.entryId)})</p>
           <p><strong>Reason:</strong> ${escapeHtml(q.reason)}</p>
           ${q.details ? `<p><strong>Details:</strong><br>${escapeHtml(q.details)}</p>` : ""}
           <p><strong>Reporter:</strong> ${q.reporterEmail ? escapeHtml(q.reporterEmail) : "(anonymous)"}</p>`,
        ),
      };
    }
  }
}

async function enqueue(
  q: QueuedEmail,
  toEmail: string,
  notBefore: Date,
  lastError: string,
): Promise<void> {
  try {
    await db.insert(emailQueueTable).values({
      template: q.template,
      to_email: toEmail,
      payload: q as unknown as Record<string, unknown>,
      not_before: notBefore,
      last_error: lastError,
    });
  } catch (e) {
    console.error("Failed to enqueue email:", e);
  }
}

async function sendOrQueue(q: QueuedEmail): Promise<EmailSendOutcome> {
  const rendered = render(q);
  if (await shouldSkipAsDuplicate(rendered.to, q.template)) {
    return { status: "deduped" };
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
    error = { name: "network_error", message: String(e) };
  }

  if (!error) {
    await recordSend(rendered.to, q.template);
    return { status: "sent" };
  }

  const classified = classifyError(error);
  if (classified.kind === "daily_quota" || classified.kind === "throttled") {
    await enqueue(q, rendered.to, classified.retryAt, `${error.name}: ${error.message}`);
    return { status: "queued", kind: classified.kind, retryAt: classified.retryAt.toISOString() };
  }

  console.error("Resend send failed:", classified.error);
  return { status: "failed", error: classified.error };
}

export const sendEntryVerificationEmail = (
  email: string,
  displayName: string,
  token: string,
) => sendOrQueue({ template: "entry_verify", email, displayName, token });

export const sendParentConsentEmail = (
  parentEmail: string,
  parentName: string,
  minorDisplayName: string,
  token: string,
) => sendOrQueue({ template: "parent_consent", parentEmail, parentName, minorDisplayName, token });

export const sendManageEntryEmail = (
  email: string,
  displayName: string,
  token: string,
) => sendOrQueue({ template: "manage_entry", email, displayName, token });

export const sendManageEntriesEmail = (
  email: string,
  entries: ManageEntryItem[],
) => sendOrQueue({ template: "manage_entries", email, entries });

export const sendReportNotificationEmail = (
  entryId: string,
  reason: string,
  details: string | null,
  reporterEmail: string | null,
  entryDisplayName: string | null,
) => {
  const to =
    process.env.ADMIN_NOTIFICATION_EMAIL || "dmvthrowers@gmail.com";
  return sendOrQueue({
    template: "report_notification",
    to,
    entryId,
    reason,
    details,
    reporterEmail,
    entryDisplayName,
  });
};
