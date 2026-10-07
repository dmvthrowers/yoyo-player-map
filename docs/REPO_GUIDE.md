# YoYo Player Map — Repository Guide

For a volunteer developer seeing this codebase for the first time. Read `AGENTS.md` (and
`.agents/AGENTS.md` for the cross-repo picture) for standing rules first.

Last checked against `main` on 2026-10-02. Adapted from the October 2026 technical audit, with
its claims re-checked against the code; where they disagreed, this file follows the code.

## 1. Purpose

A privacy-first public map of yo-yo players, clubs and shops, run by DMV Throwers. Anyone can
add a listing (person, shop or club) by display name and city. The submitter verifies their
email; minors aged 13–17 also need a parent or guardian's consent before the pin goes live.
Person pins are jittered randomly within ~10 miles of the city, so the map only shows an
approximate area. Exact addresses appear only for shops, and for clubs that opt in to
publishing their venue. No accounts, no messaging, no GPS. Moderation is a shared-secret admin
dashboard.

Production: `https://map.dmvthrowers.club` (Vercel). Only `main` deploys; preview deployments
are off (`yoyomap/vercel.json`).

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | `preferredRegion: 'iad1'` on the map page |
| Language | TypeScript 6 | Stay on 6.x until TS 7.1 ships a stable JS API |
| UI | Tailwind CSS 4, Radix primitives, lucide-react | `@/` maps to `yoyomap/` |
| i18n | next-intl 4 | 11 locales (`en es de zh ja fr pt ru ar hi ko`); missing keys fall back to English |
| Map | Leaflet 1.9, react-leaflet 4, react-leaflet-cluster 3 | Client-only (`dynamic`, `ssr:false`). React 18 for now — see roadmap |
| Database | Supabase (Postgres + RLS) | Anon client in the browser; service-role client server-side only |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` | Sliding window per action; fails open if Redis is unset |
| Bot check | Cloudflare Turnstile (`lib/turnstile.ts`) | On submit and report |
| Email | Resend + an email queue | Over-quota sends are queued and drained by cron |
| Errors | Sentry | Off when the DSN is unset |
| Geocoding | Nominatim (OSM), server-side | 1 req/sec pacing, cached in `geocode_cache` |
| Validation | Zod 4 | `lib/validation.ts` |
| Package manager | pnpm 10 | `yoyomap/` is standalone: always `pnpm install --ignore-workspace` |

Security headers (CSP, HSTS, `frame-ancestors 'none'`, Permissions-Policy) are set in
`yoyomap/next.config.js`.

## 3. Layout

```
yoyo-player-map/
├── yoyomap/            ← THE APP
├── lib/, artifacts/, scripts/   Root workspace packages and utilities — not used by the app
├── skills/, .agents/   Agent skill definitions and cross-repo maintainer notes
├── docs/               This guide, ROADMAP.md, EMAIL_QUEUE_PLAN.md
└── .github/workflows/  ci, migrate, db-backup, dependency-review, hygiene bots
```

Inside `yoyomap/`:

- `src/middleware.ts` — next-intl locale routing; bare paths like `/map` redirect to `/en/map`.
- `src/app/[locale]/` — pages: `map/` (the map; server component that loads pins once per 24h
  through `unstable_cache`, tag `public-entries`), `submit/`, `players/[[...]]` (SEO directory),
  `admin/`, `confirm-location/[token]`, `profile/`, `status/`, `report/`, `contact/`, `legal/*`.
- `src/app/api/` — route handlers (table below).
- `lib/` (note: `yoyomap/lib/`, not `src/lib/`) — `rate-limit.ts`, `admin-auth.ts`,
  `supabase/admin.ts`, `tokens.ts`, `email.ts`, `geocode.ts`, `validation.ts`, `turnstile.ts`,
  `revalidate.ts`, `api-error.ts`.
- `messages/` — one JSON file per locale. `pnpm i18n:parity` reports missing keys.
- `supabase/` — `schema.sql`, `migrations/` (applied by `.github/workflows/migrate.yml` on push to
  `yoyomap/supabase/**`), seeds.

### API routes

| Route | Job | Rate limit |
|---|---|---|
| `POST api/submit` | Turnstile → zod → honeypot → geocode + jitter → insert hidden entry → verification email (+ parent-consent email for minors) | 5/IP/hr |
| `GET api/verify-parent` | Handles both the email-verification link and the parent-consent link; publishes when every required gate has passed | 20/IP/hr |
| `POST api/auth/magic-link` | Sends a manage-entry link; always returns success (no email enumeration) | 5/IP/hr |
| `GET api/auth/verify-link` | Validates a manage-entry token for the profile editor | 10/IP/hr |
| `GET/POST api/confirm-location` | Owner confirms or corrects a location from an admin outreach email | 20 / 10 per IP/hr |
| `POST api/profile/update`, `api/profile/delete` | Edit, or permanently delete (with any parent-consent row), via a valid magic token | 10/15 min, 5/hr |
| `GET api/entry/[id]` | Lazy popup details; CDN-cached 5 min so takedowns propagate quickly | 60/IP/min |
| `GET/POST api/locations` | Country/region/city lists; add a city | 30/min, 10/hr |
| `POST api/report` | Turnstile → report. `impersonation`, `fake_business`, `unauthorized_listing` auto-hide the entry and email the admin | 10/IP/hr |
| `api/admin/*` | Dashboard data, moderation actions, re-geocode, reminders, email-queue drain, map refresh. `x-admin-token` checked by `requireAdmin` (timing-safe, 30/IP/15 min, fails closed under 16 chars) | via `requireAdmin` |
| `GET api/cron` | Daily Vercel cron (10:00 UTC) → verification reminders | `CRON_SECRET` |
| `POST api/revalidate-map` | On-demand revalidation, `REVALIDATE_SECRET` | 20/IP/5 min |
| `GET api/health` | Health probe | — |

## 4. How it works

**Submit → verify → publish.** `POST /api/submit` inserts the entry with `is_visible=false`,
creates a hashed `email_verify` token (24h) and sends the verification email. For a minor it also
creates a `parent_consents` row with a hashed token (7 days) and emails the parent. Clicking the
link (`/api/verify-parent?type=entry`) sets `verified_at`; adults, shops and clubs are published
immediately. A minor is published only when **both** their email is verified and the parent has
consented (`type=consent`), in either order. **There is no manual approval step** — email
verification is the publishing gate; moderation happens after the fact through reports and the
admin dashboard. Every publish/unpublish calls `revalidateEntryLocations()` so the 24h map cache
doesn't hide changes.

**Tokens** are random values; only their SHA-256 hash is stored (`lib/tokens.ts`). There is no
signing secret.

**Admin.** `/[locale]/admin` asks for the password and sends it as `x-admin-token` on every call.
Actions: flag/unflag, delete (permanent), resolve reports, clear auto-hide, re-geocode, reminders,
bulk location status and outreach (≤ 500).

**Failure UX.** If the pin query fails, the map shows an error banner (and the failure isn't
cached). If `/api/locations` fails, the submit form says so instead of showing empty dropdowns.

## 5. Config

Env var names are in `yoyomap/.env.local.example` with notes. Production values live in Vercel.
Highlights: `SUPABASE_SERVICE_ROLE_KEY` (server only), `ADMIN_PASSWORD` (≥ 16 chars enforced; use
32+ random), `CRON_SECRET`, `REVALIDATE_SECRET`, Upstash, Resend, Turnstile, Sentry, QStash.

Local dev: `cd yoyomap && pnpm install --ignore-workspace && cp .env.local.example .env.local`,
fill it in, `pnpm dev`. Node 22, pnpm 10 (`corepack enable`).

Checks to run before a PR (all in CI):

```bash
cd yoyomap
pnpm exec tsc --noEmit
pnpm lint
pnpm test                 # node:test files under src/ and lib/
pnpm i18n:parity --strict # fails below 95%
pnpm build
```

## 6. Where to go next

- `docs/ROADMAP.md` — open work, in priority order.
- `docs/EMAIL_QUEUE_PLAN.md` — how over-quota email is queued and drained.
- `yoyomap/docs/LAUNCH-CHECKLIST.md` — Vercel and Supabase setup steps.
- [Technical docs - Oct 2026](https://drive.google.com/drive/folders/1Jt7amThKNkeVJenksPtA87cBtR-nwZiq)
  (Google Drive, access-restricted) — the full audit this guide came from, including the
  security assessment and runbooks kept out of the public repo.
