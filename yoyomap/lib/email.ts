import { Resend } from 'resend';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM || 'DMV Throwers YoYo Map <noreply@dmvthrowers.club>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://map.dmvthrowers.club';

/** Shared wrapper styles for all transactional emails. */
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

export async function sendEntryVerificationEmail(
  email: string,
  displayName: string,
  token: string
): Promise<void> {
  const link = `${APP_URL}/api/verify-parent?type=entry&token=${encodeURIComponent(token)}`;
  const html = emailShell(
    'Verify your YoYo Map entry',
    `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi ${escapeHtml(displayName)},</h2>
     <p>Click the button below to confirm your email and publish your entry on the YoYo Map.</p>
     <p style="margin:20px 0;"><a href="${link}" style="background:#C8102E;color:#ffffff;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">Verify &amp; Publish</a></p>
     <p style="font-size:12px;color:#555;">Or paste this link into your browser:<br><span style="word-break:break-all;">${link}</span></p>
     <p style="font-size:12px;color:#555;">This link expires in 24 hours.</p>`
  );
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Verify your YoYo Map entry',
    html,
  });
}

export async function sendParentConsentEmail(
  parentEmail: string,
  parentName: string,
  minorDisplayName: string,
  token: string
): Promise<void> {
  const link = `${APP_URL}/api/verify-parent?type=consent&token=${encodeURIComponent(token)}`;
  const html = emailShell(
    'Parent/guardian consent required',
    `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi ${escapeHtml(parentName)},</h2>
     <p><strong>${escapeHtml(minorDisplayName)}</strong> has asked to be listed on YoYo Map — a community directory that helps yo-yoers find each other.</p>
     <p>As the parent or legal guardian of a user under 18, we need your consent before we can publish their entry. Here's what will be visible publicly:</p>
     <ul>
       <li>Their chosen display name (not legal name unless they chose that)</li>
       <li>Their city and region (never exact address or GPS)</li>
       <li>An optional short bio and social media handles they entered</li>
       <li>An approximate map pin, blurred to a ~10 mile radius</li>
     </ul>
     <p>What we do NOT show publicly: email address, age, real name, or exact location.</p>
     <p>There is no messaging feature on the site. Other users cannot contact ${escapeHtml(minorDisplayName)} through the map.</p>
     <p>You can withdraw consent at any time by replying to this email or contacting dmvthrowers@gmail.com, and the entry will be removed.</p>
     <p style="margin:20px 0;"><a href="${link}" style="background:#C8102E;color:#ffffff;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">I Consent — Publish the Entry</a></p>
     <p style="font-size:12px;color:#555;">Or paste this link into your browser:<br><span style="word-break:break-all;">${link}</span></p>
     <p style="font-size:12px;color:#555;">This consent link expires in 7 days. If you do nothing, the entry will not be published.</p>
     <p style="font-size:12px;color:#555;">Full privacy policy: ${APP_URL}/legal/privacy</p>`
  );
  await getResend().emails.send({
    from: FROM,
    to: parentEmail,
    subject: `Consent needed: ${minorDisplayName} wants to join YoYo Map`,
    html,
  });
}

export async function sendEntryReminderEmail(
  email: string,
  displayName: string,
  token: string
): Promise<void> {
  const link = `${APP_URL}/api/verify-parent?type=entry&token=${encodeURIComponent(token)}`;
  const html = emailShell(
    'Reminder: verify your YoYo Map entry',
    `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi ${escapeHtml(displayName)},</h2>
     <p>Just a nudge — we have a YoYo Map entry waiting on your email confirmation. It won't appear on the map until you click verify.</p>
     <p style="margin:20px 0;"><a href="${link}" style="background:#C8102E;color:#ffffff;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">Verify &amp; Publish</a></p>
     <p style="font-size:12px;color:#555;">Or paste this link into your browser:<br><span style="word-break:break-all;">${link}</span></p>
     <p style="font-size:12px;color:#555;">This link expires in 24 hours. If you didn't sign up, you can ignore this email — your entry will be cleaned up automatically.</p>`
  );
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Reminder: verify your YoYo Map entry',
    html,
  });
}

export async function sendManageEntryEmail(
  email: string,
  displayName: string,
  token: string
): Promise<void> {
  const link = `${APP_URL}/profile?token=${encodeURIComponent(token)}`;
  const html = emailShell(
    'Manage your YoYo Map entry',
    `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">Hi ${escapeHtml(displayName)},</h2>
     <p>Click the link below to edit or delete your YoYo Map entry.</p>
     <p style="margin:20px 0;"><a href="${link}" style="background:#1a1f36;color:#F5F0E8;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">Manage My Entry</a></p>
     <p style="font-size:12px;color:#555;">Or paste this link into your browser:<br><span style="word-break:break-all;">${link}</span></p>
     <p style="font-size:12px;color:#555;">This link expires in 1 hour.</p>`
  );
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Manage your YoYo Map entry',
    html,
  });
}

export async function sendReportNotificationEmail(
  entryId: string,
  reason: string,
  details: string | null,
  reporterEmail: string | null,
  entryDisplayName: string | null
): Promise<void> {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL || 'dmvthrowers@gmail.com';
  const adminLink = `${APP_URL}/admin`;
  const html = emailShell(
    'New report submitted',
    `<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;">New report on YoYo Map</h2>
     <p><strong>Entry:</strong> ${escapeHtml(entryDisplayName || '(unknown)')} <span style="color:#777;">(${escapeHtml(entryId)})</span></p>
     <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
     ${details ? `<p><strong>Details:</strong><br>${escapeHtml(details)}</p>` : ''}
     <p><strong>Reporter:</strong> ${reporterEmail ? escapeHtml(reporterEmail) : '(anonymous)'}</p>
     <p style="margin:20px 0;"><a href="${adminLink}" style="background:#C8102E;color:#ffffff;padding:12px 24px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">Open Admin Dashboard</a></p>`
  );
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `[YoYo Map] Report: ${reason}`,
    html,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
