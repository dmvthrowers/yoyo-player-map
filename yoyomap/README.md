
# DMV Throwers · YoYo Map

**A privacy-first community map for yo-yoers, by DMV Throwers Yo-Yo & Skill Toy Club.**

**Live map:** [map.dmvthrowers.club](https://map.dmvthrowers.club)
**Website:** [dmvthrowers.club](https://dmvthrowers.club)
**Instagram:** [@dmv_throwers](https://instagram.com/dmv_throwers)
**Linktree:** [linktr.ee/dmvthrowers](https://linktr.ee/dmvthrowers)
☕ **Support us:** [ko-fi.com/dmvthrowers](https://ko-fi.com/dmvthrowers)

Last updated: 2026-10-02. For the architecture walkthrough see [`../docs/REPO_GUIDE.md`](../docs/REPO_GUIDE.md); for open work, [`../docs/ROADMAP.md`](../docs/ROADMAP.md).

---

## About the Project

YoYo Map helps yo-yoers find each other by letting users submit a display name, city, and (optionally) socials and a short bio. Players, shops and clubs can all be listed. Person pins show only an approximate area (jittered ~10 miles). No messaging, no GPS, no data sales. Available in 11 languages. Built for privacy, safety, and community.

---

## Contact

| | |
| --- | --- |
| **Club Email** | <contact@dmvthrowers.club> |
| **Contest Email** | <vastateyoyocontest@gmail.com> |
| **Phone** | <850-284-1613> |
| **Instagram** | [@dmv_throwers](https://instagram.com/dmv_throwers) |
| **Coordinator** | Brandon Rogers |

---

## Site Structure

| Page | URL |
| --- | --- |
All pages are locale-prefixed (`/en/…`, `/es/…`); bare paths redirect to `/en/…`.

| Page | URL |
| --- | --- |
| Home | [map.dmvthrowers.club/en](https://map.dmvthrowers.club/en) |
| Map | [map.dmvthrowers.club/en/map](https://map.dmvthrowers.club/en/map) |
| Players directory | [map.dmvthrowers.club/en/players](https://map.dmvthrowers.club/en/players) |
| Submit | [map.dmvthrowers.club/en/submit](https://map.dmvthrowers.club/en/submit) |
| Profile | [map.dmvthrowers.club/en/profile](https://map.dmvthrowers.club/en/profile) |
| Report | [map.dmvthrowers.club/en/report](https://map.dmvthrowers.club/en/report) |
| Status | [map.dmvthrowers.club/en/status](https://map.dmvthrowers.club/en/status) |
| Admin | [map.dmvthrowers.club/en/admin](https://map.dmvthrowers.club/en/admin) |
| Legal: Privacy | [map.dmvthrowers.club/en/legal/privacy](https://map.dmvthrowers.club/en/legal/privacy) |
| Legal: Terms | [map.dmvthrowers.club/en/legal/terms](https://map.dmvthrowers.club/en/legal/terms) |
| Contact | [dmvthrowers.club/contact.html](https://dmvthrowers.club/contact.html) |
| Main Club Site | [dmvthrowers.club](https://dmvthrowers.club) |

---

## File Structure

```text
yoyomap/
├── src/
│   ├── middleware.ts          locale routing (next-intl)
│   └── app/
│       ├── [locale]/          pages: map, submit, players, profile, report, status,
│       │                      contact, admin, confirm-location, legal/*
│       └── api/               route handlers (see ../docs/REPO_GUIDE.md)
├── lib/                       supabase, geocode, email, validation, tokens,
│                              rate-limit, turnstile, admin-auth, api-error
├── i18n/, messages/           next-intl config + one JSON file per locale
├── supabase/                  schema.sql, migrations/, seeds
├── scripts/                   i18n parity and maintenance scripts
├── docs/                      launch checklist, egress validation, historical plans
└── public/                    favicon, OG image, bulletins
```

---

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**, React 18
- **next-intl** — 11 locales
- **Supabase** — Postgres, Row-Level Security
- **Resend** — Transactional email, with a queue for over-quota sends
- **Upstash Redis** — rate limiting; **Cloudflare Turnstile** — bot check on submit/report
- **Sentry** — error reporting (optional)
- **Leaflet + OpenStreetMap** — Map rendering (no Google Maps key needed)
- **Nominatim** — City geocoding (free, no key)
- **Vercel** — Hosting (`main` only; previews off)

Total monthly cost at launch-day scale: **$0** (all free tiers).

---

## ⚠️ Before you launch

**Have a lawyer review the privacy policy and terms of service.** The drafts in `app/legal/` are a reasonable starting point specific to this architecture, but they are not a substitute for legal review. A Virginia nonprofit clinic, an early-career lawyer, or a service like LegalZoom can likely do this for a couple hundred dollars or less.

Specifically, a lawyer should confirm:

- The COPPA parental consent flow qualifies as "verifiable" for your risk tolerance (email-only is the lighter end of acceptable — stronger options exist)
- GDPR/CCPA rights language is accurate for your operations
- Limitation of liability and governing law clauses are appropriate for DMV Throwers as an EIN-registered sole-prop DBA

---

## Local setup

### 1. Install Node.js 22 and pnpm

```bash
node --version  # should be 22.x
corepack enable # provides the pnpm version pinned in package.json
```

### 2. Install dependencies

```bash
cd yoyomap
pnpm install --ignore-workspace   # yoyomap is standalone, not a workspace member
```

### 3. Set up Supabase

1. Create a free account at <https://supabase.com>
2. Create a new project (choose a region close to you — US East works fine)
3. Once provisioned, go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ keep this secret)
4. Apply the schema and migrations: `supabase link` to the project, then `supabase db push` (production gets them automatically from `.github/workflows/migrate.yml` on push to `main`). For a scratch project you can instead paste `supabase/schema.sql` into the SQL editor and then each file in `supabase/migrations/` in order.
5. Verify: the `Table Editor` should show `entries`, `parent_consents`, `verification_tokens`, `reports`, `audit_log` and the location tables, and a `map_entries` view.

### 4. Set up Resend (email)

1. Create account at <https://resend.com>
2. Add and verify `dmvthrowers.club` as a sending domain (they'll give you DNS records to add)
3. Create an API key → `RESEND_API_KEY`
4. Your "from" address: `noreply@dmvthrowers.club` (or similar on the verified domain)

If you want to skip this for local testing, Resend's sandbox works from `onboarding@resend.dev` to your own verified email only.

### 5. Create `.env.local`

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

Generate `CRON_SECRET` and `REVALIDATE_SECRET` with `openssl rand -hex 32`.
(Verification tokens are random values stored SHA-256 hashed; there is no
`ENTRY_SECRET` any more — delete it from Vercel if it's still set.)

Set `ADMIN_PASSWORD` to something strong — this is how you log into `/admin`.

### 6. Run it

```bash
pnpm dev
```

Visit <http://localhost:3000>

---

## Deploy to Vercel

Production is already set up: the Vercel project deploys `main` to `map.dmvthrowers.club` (root directory `yoyomap`). To stand up a new copy:

1. Import the GitHub repo in Vercel and set the root directory to `yoyomap`.
2. In **Environment Variables**, add every key from `.env.local.example`. Mark secrets (service-role key, Resend key, `ADMIN_PASSWORD`, `CRON_SECRET`, `REVALIDATE_SECRET`, Turnstile secret) as **Sensitive**.
3. Deploy, then add the domain and point its DNS CNAME at Vercel.

The repo is public, so never commit `.env.local` — a service-role key committed in May 2026 had to be treated as exposed. See `docs/LAUNCH-CHECKLIST.md`.

---

## Architecture notes

### Privacy-first design choices

**Coordinate jitter.** When a user submits, we geocode their city, then randomly offset the result by up to ~10 miles before storing. This happens in both `lib/geocode.ts#jitterCoords` and a Postgres function. The jittered value is stored permanently — we never have access to the true location.

**Public view isolation.** Reads from the map come through the `map_entries` view, which explicitly excludes email, age, parent consent records, and anything else that shouldn't leave the server.

**Row-Level Security.** Direct table access is revoked for the `anon` role. All writes go through server-side API routes using the service role key, which runs only in Vercel's serverless functions — never in the browser bundle.

**Parental consent.** The service isn't for children under 13. Submissions from 13–17-year-olds are not visible until both the teen verifies their email and a parent clicks a unique consent link sent to the email provided. We log IP and user-agent at consent time as an audit trail. Consent can be revoked by email.

**No direct messaging.** The site deliberately does not implement messaging. Any user contact happens through whatever social handles each user chose to share.

**Bot and abuse controls.** Cloudflare Turnstile on submit and report, a hidden honeypot field, and per-IP Upstash rate limits on every public write route. Email verification is the publishing gate — there is no manual approval queue; moderation happens through reports and the admin dashboard.

The full file and route map is in [`../docs/REPO_GUIDE.md`](../docs/REPO_GUIDE.md).

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vercel v0 (UI Primitives)](https://v0.dev/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Resend Email API](https://resend.com/docs)

---

## Maintenance

### Admin dashboard

Visit `/admin`, enter the `ADMIN_PASSWORD`, and you get:

- Stats (total, visible, pending, flagged, auto-hidden, minors, open reports, counts by type and location status)
- Open reports with action buttons (hide, delete, resolve)
- Full entry list with flag/unflag/delete (permanent) controls, re-geocode, reminders and location outreach

### Data retention

The schema supports cleanup, but doesn't auto-run it. Consider setting up a weekly Supabase scheduled function (or a Vercel cron) to:

- Delete `audit_log` rows older than 90 days
- Delete expired `verification_tokens`
- Optional: delete `parent_consents` 3 years after the linked entry was deleted

### Monitoring

Supabase gives you the DB logs. Vercel gives you serverless function logs. Sentry captures errors when `NEXT_PUBLIC_SENTRY_DSN` is set, and scheduled jobs check in to Healthchecks.io when `HEALTHCHECKS_PING_KEY` is set. Most API error responses carry an `x-request-id` to match against the logs (the rest are on the roadmap). `.github/workflows/db-backup.yml` takes a nightly encrypted database dump once its secrets are set.

### COPPA audit trail

Every consent grant logs IP, user-agent, timestamp, and consent token. If you ever need to prove a consent happened (FTC inquiry, parent dispute), the records are in `parent_consents` and `audit_log`.

---

## What's intentionally NOT built

- **User accounts.** Entry owners manage their listing through emailed magic links. No passwords (the admin dashboard uses one shared password).
- **Image uploads.** Fewer attack surfaces.
- **Direct messaging.** Safety over feature count.
- **Analytics.** Privacy over optimization. (`@vercel/analytics` is installed but not mounted — see the roadmap.)
- **Payment.** Always free.
- **Mobile apps.** The web is responsive. Mobile is for later.

---

## License

This project is free and unencumbered software released into the public domain under [The Unlicense](https://unlicense.org/). See LICENSE for details.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## Questions?

Email [contact@dmvthrowers.club](mailto:contact@dmvthrowers.club) or open an issue.
