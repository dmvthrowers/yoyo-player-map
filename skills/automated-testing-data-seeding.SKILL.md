# Automated Testing & Data Seeding — yoyo-player-map

Use this before changing location handling, submissions, translations, or anything you'd
want sample data for. The app lives in `yoyomap/`; run commands from there with pnpm.

## Checks (all run in `.github/workflows/ci.yml`)

```bash
cd yoyomap
pnpm install --frozen-lockfile
pnpm test                    # node:test, src/**/*.test.mjs + lib/**/*.test.mjs
pnpm typecheck               # tsc --noEmit
pnpm lint
pnpm i18n:parity --strict    # CI fails if any locale drops below 95% of en.json
```

**i18n rule:** every new key in `messages/en.json` needs a value in all 10 other locales
(ar, de, es, fr, hi, ja, ko, pt, ru, zh) in the same PR. With ~386 keys, about 19 missing
keys is enough to fail CI. Keep every locale at 100%.

## Current unit tests

| File | Covers |
|---|---|
| `lib/submit-dedupe.test.mjs` | duplicate-submission detection |
| `lib/api-error-message.test.mjs` | API error text shown to users |
| `src/app/api/confirm-location/normalization.test.mjs` | city/region normalization |
| `src/app/[locale]/admin/_components/filters.test.mjs` | admin list filters |

Gaps worth filling next: the ~10-mile person-pin jitter (never exact, always within bound),
venue_public exact-coordinate rule for shops/clubs, and the 50-mile underserved calculation.

## Seed data

| Source | What it loads | How |
|---|---|---|
| `scripts/seed-locations.mjs` | GeoNames countries, admin-1 regions, cities over 50k population | `pnpm seed-locations` with `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Idempotent upserts. Needs network to download.geonames.org. |
| `supabase/seed_clubs.sql` | Clubs from `yoyo_clubs.csv`, with `venue_public` rules | Paste into the SQL editor. Skips names that already exist. |
| `supabase/yoyo_storefronts_us.sql`, `yoyo_storefronts_global.sql` | Bulk club/shop inserts generated April 2026 | Paste into the SQL editor. Not idempotent; check for duplicates first. |

Privacy rules every seed must follow:
- People: city-level only, jittered. Never store a street address or GPS point for a person.
- Exact coordinates only for shops and clubs that meet at a named public venue
  (`venue_public = true`). Rotating, private or "contact X" clubs get `venue_public = false`.
- Use `@example.com` placeholder emails in committed SQL. Don't commit personal emails.

Run seeds against a staging or local project first, never straight to production.
