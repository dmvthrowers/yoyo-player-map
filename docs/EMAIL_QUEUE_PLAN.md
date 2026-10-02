# Email and Payment Queue Plan

Covers the YoYo Map (`yoyo-player-map`) and VSYC registration (`VA-States`) apps.
Written 2026-10-01. Map app ships first, then the registration app before VSYC-27
registration opens.

## The constraint: 100 emails a day

Resend's free tier allows **100 emails per UTC day and 3,000 a month**. The day resets
at **00:00 UTC**, which is 8 PM Eastern in summer and 7 PM Eastern in winter. It's a
calendar day, not a rolling 24 hours. Inbound mail counts toward the cap too.
([Resend: account quotas and limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits))

The quota belongs to the Resend **account**, and both apps share one account, so they
share the 100. Every Resend send response includes `x-resend-daily-quota`, the account's
usage so far today. Each app records the higher of that and its own count, so each one
sees the other's sends as of its own most recent send. `EMAIL_DAILY_LIMIT` defaults to
**90** in both apps. The last 10 are a buffer for inbound mail and for sends the other
app made since our last look. Resend's per-second limit is 10 requests per account. Each
app's drain sends at most 2 a second, so even both draining at once stays far below it.
([Resend: usage limits](https://resend.com/docs/api-reference/rate-limit))

So a queue has to do two jobs:

1. **Retry** what failed (throttling, Resend outages, the cap).
2. **Ration** the cap so emails someone is waiting on go first.

## Shared design (both apps)

| Piece | What it does |
| --- | --- |
| Queue table | One row per email that couldn't go out right away. Holds the template payload, `priority`, `not_before`, `attempts`, `expires_at`, `claimed_at`, `sent_at`, `dead_at`. |
| Priority | `0` someone is waiting (verify link, magic link, registration confirmation). `1` admin alert. `2` bulk (reminders, outreach, surveys). The drain sends lowest number first. |
| Daily budget | `email_daily_usage` tracks account-wide sends per UTC day (Resend's header, or our own count when absent). Bulk email stops at `EMAIL_DAILY_LIMIT - EMAIL_PRIORITY_RESERVE` (default 90 - 30 = 60), so 30 sends are always left for priority 0. |
| Claiming | `claim_*` Postgres function uses `FOR UPDATE SKIP LOCKED`, so two drains running at once never send the same email. A claim older than 5 minutes is reclaimed. |
| Retries | Throttling, 5xx and network errors back off 1, 2, 4, 8 minutes. After 5 attempts the row is marked dead. Quota waits don't use up attempts. |
| Expiry | A row whose link has expired is marked dead instead of being sent. Emails whose link would expire before midnight UTC aren't queued at all; the person is told to try again after the reset. |
| Drain triggers | Supabase `pg_cron` every 5 minutes, calling the app only when a row is due (no calls while the queue is empty). Vercel cron at 00:05 UTC. A small drain after every successful send (`after()`). Each drain sends at most 2/second and stops starting new sends after 40 s. |
| Setup | Store the app's `CRON_SECRET` in Supabase Vault once (see the migration header). Until then the 5-minute job gets 401s and the other two triggers still work. |

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
  registration, record it in `vsyc_payment_flags`, alert the admin (priority 1), and
  leave the refund to the treasurer.
- **Delayed confirmation.** One `applyPaidSession()` path is used by the webhook, by the
  confirm page (which asks Stripe directly while the webhook catches up), and by a
  reconcile sweep every 15 minutes for open checkouts. Whichever sees the payment first
  marks the registration paid. The others are no-ops.
- **Payment confirmation email** from the webhook through the outbox, with
  `dedupe_key = payment:<registration_id>`.

### 2c. Comp codes

- Replace the check-then-increment in `/api/register` with one atomic
  `redeem_comp_code()` (`UPDATE … WHERE uses_count < max_uses RETURNING`), run
  before the registration insert, so codes can't go past `max_uses`.

## Decisions (2026-10-02)

1. Both apps share one Resend, Supabase organization, Upstash and Vercel account. The
   budget is shared through Resend's quota header, with a 10-email buffer.
2. Duplicate payments are **flagged**, never auto-refunded.
3. The queue drains on a schedule, paced under the free-tier limits with a buffer.
4. Payments get a confirmation step that tolerates Stripe delays. The confirm page checks
   Stripe directly while the webhook catches up, and a scheduled sweep reconciles any
   registration whose checkout finished but wasn't marked paid.
