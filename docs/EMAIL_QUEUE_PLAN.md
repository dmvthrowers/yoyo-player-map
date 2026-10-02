# Email and Payment Queue Plan

Covers the YoYo Map (`yoyo-player-map`) and VSYC registration (`VA-States`) apps.
Written 2026-10-01. Map app ships first, then the registration app before VSYC-27
registration opens.

## The constraint: 100 emails a day

Resend's free tier allows **100 emails per UTC day and 3,000 a month**. The day resets
at **00:00 UTC**, which is 8 PM Eastern in summer and 7 PM Eastern in winter. It's a
calendar day, not a rolling 24 hours. Inbound mail counts toward the cap too.
([Resend: account quotas and limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits))

The quota belongs to the Resend **account**, not the app. If both apps send from the same
Resend account, they share the 100. Set `EMAIL_DAILY_LIMIT` in each app so the two add
up to 100 or less.

So a queue has to do two jobs:

1. **Retry** what failed (throttling, Resend outages, the cap).
2. **Ration** the cap so emails someone is waiting on go first.

## Shared design (both apps)

| Piece | What it does |
| --- | --- |
| Queue table | One row per email that couldn't go out right away. Holds the template payload, `priority`, `not_before`, `attempts`, `expires_at`, `claimed_at`, `sent_at`, `dead_at`. |
| Priority | `0` someone is waiting (verify link, magic link, registration confirmation). `1` admin alert. `2` bulk (reminders, outreach, surveys). The drain sends lowest number first. |
| Daily budget | `email_daily_usage` counts sends per UTC day. Bulk email stops at `EMAIL_DAILY_LIMIT - EMAIL_PRIORITY_RESERVE` (default 100 - 30 = 70), so 30 sends are always left for priority 0. |
| Claiming | `claim_*` Postgres function uses `FOR UPDATE SKIP LOCKED`, so two drains running at once never send the same email. A claim older than 5 minutes is reclaimed. |
| Retries | Throttling, 5xx and network errors back off 1, 2, 4, 8 minutes. After 5 attempts the row is marked dead. Quota waits don't use up attempts. |
| Expiry | A row whose link has expired is marked dead instead of being sent. Emails whose link would expire before midnight UTC aren't queued at all; the person is told to try again after the reset. |
| Drain triggers | Vercel cron at 00:05 UTC for the post-reset backlog, plus a small drain after every successful send (`after()`), so short delays clear within minutes whenever the site has traffic. |
| Optional | Supabase `pg_cron` + `pg_net` calling the drain route every 5 minutes, if the after-send drain proves too slow on quiet days. Needs `CRON_SECRET` stored in Supabase Vault. |

## Phase 1: Map app (this PR)

Found while planning: **when the cap is hit, emails are dropped, not queued.** Resend
reports the cap as `daily_quota_exceeded`, but the code only recognized
`rate_limit_exceeded`. Every email after the 100th of the day was marked failed.

- [x] `v33` migration: `priority`, `claimed_at`, `dead_at`, `expires_at` on `email_queue`;
      `claim_email_queue()`; `email_daily_usage` + `record_email_send()`.
- [x] Recognize `daily_quota_exceeded` and `monthly_quota_exceeded`; queue 5xx and
      network errors too.
- [x] Budget reserve: the 10:00 UTC reminder cron stops at the bulk budget instead of
      spending the whole day's quota (it used to try up to 500).
- [x] Reminders over budget aren't queued; the next cron run sends a fresh one.
- [x] 1-hour manage links aren't queued past their expiry; the profile page says to
      request again after midnight UTC.
- [x] Drain retries rows in place, marks dead after 5 attempts, keeps 30 days of history.

Priorities: `entry_verify`, `parent_consent`, `manage_entry`, `manage_entries` = 0 ·
`report_notification` = 1 · `entry_reminder`, `location_confirm` = 2.

## Phase 2: Registration app (`VA-States`), before VSYC-27 registration

These are the issues behind the double payment and the missing confirmation.

### 2a. Email outbox

Every email goes through the outbox. The route writes the row and tries to send it
right away. Right now confirmation emails are fire-and-forget with a 2.5 s timeout and
the result is discarded, so a slow Resend means a lost confirmation with no record.

- Same table, claim and budget design as above (`email_outbox`).
- `dedupe_key` (unique) so a retry or webhook replay can't enqueue twice, e.g.
  `confirm:<registration_id>:<to>`, `payment:<registration_id>`.
- Templates and priority: competitor + parent confirmation, payment received,
  spectator and volunteer confirmations = 0. Admin alerts = 1. Survey invites and
  payment reminders = 2.
- Survey invites today send up to 100 per batch call. With a 100-a-day cap,
  everything past the first 100 fails. Through the outbox they spread across days
  automatically.
- Admin dashboard: outbox counts (queued, dead) and a "retry dead" button.

### 2b. Payments: one payment per registration

- **Checkout de-duplication.** Before creating a Checkout Session, reuse the
  registration's open session if there is one, or expire it before creating a new
  one. So a registration never has two payable sessions (two tabs, double-click,
  back button). Guard with an atomic row claim so two simultaneous clicks can't both
  create one.
- **Webhook inbox.** `stripe_events` table keyed by Stripe event id: insert first,
  process, mark processed. Gives a full record of every payment event and makes
  replays a no-op.
- **Duplicate payment detection.** If a paid event arrives for an already-paid
  registration, record it as `duplicate_payment`, alert the admin (priority 1), and
  either refund automatically or leave it for the treasurer.
  **Decision needed: auto-refund or flag only.**
- **Payment confirmation email** from the webhook through the outbox, with
  `dedupe_key = payment:<registration_id>`.

### 2c. Comp codes

- Replace the check-then-increment in `/api/register` with one atomic
  `redeem_comp_code()` (`UPDATE … WHERE uses_count < max_uses RETURNING`), run
  before the registration insert, so codes can't go past `max_uses`.

## Open questions

1. Do the map and registration apps share one Resend account? If so, split the 100
   (for example map 40, registration 60 during registration season).
2. Duplicate payments: auto-refund, or flag for the treasurer?
3. Is a 5-minute `pg_cron` drain wanted, or are the after-send drain plus the
   nightly cron enough?
