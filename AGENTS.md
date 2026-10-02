# AGENTS.md — yoyo-player-map

Orientation for any AI agent (Claude, Codex, or otherwise) landing in this repo cold.

## What this is

The public player/club/shop map for DMV Throwers Yo-Yo & Skill Toy Club — live at
[map.dmvthrowers.club](https://map.dmvthrowers.club). Privacy-first by
design: players submit a display name + city and appear as a jittered pin (~10 mile blur); only
shops/clubs that opt in get a precise location. No accounts, no messaging, no GPS, no data
sales — that's a product constraint, not just a README claim, so don't add anything that would
narrow the blur radius or expose exact locations without deliberately revisiting that design.

**There's already a broader, cross-repo maintainer doc**: [`MULTI-REPO-AGENTS.md`](MULTI-REPO-AGENTS.md)
(a root-level symlink to `.agents/AGENTS.md`, added 2026-08-14 so it's actually discoverable
instead of sitting undiscovered in a dot-dir) covers dmvthrowers.github.io, this repo,
`dmvt-event-hub`, and `DMVT-Design` together (brand voice, color/typography system, contact
info, cross-repo workflows). Read it too — this file only covers what's specific to *this*
repo. Both files now say Next.js 16, matching `yoyomap/package.json`.

Public copy follows the club-site rule: facts about how the map works cite their source.
The home page "How the Map Works" section links the code it describes (`lib/geocode.ts` blur
radius, `lib/geo.ts` underserved distance). Change the copy if you change those constants.

## Layout

```
yoyomap/                 the actual app -- standalone pnpm project, NOT part of the root workspace
yoyomap/src/app/          Next.js 16 App Router
yoyomap/supabase/migrations/   v2 through v34 (forward-only, never edit a shipped one)
yoyomap/messages/         next-intl locale files (11 languages: en es fr de pt ja ko zh ar ru hi)
yoyomap/components/, lib/ shared UI + Supabase client code
scripts/                  standalone TS utilities (e.g. location-data fixes)
skills/, .agents/         agent skill definitions for AI-assisted maintenance (see above)
docs/                     REPO_GUIDE.md (start here), ROADMAP.md (open work), EMAIL_QUEUE_PLAN.md
yoyomap/docs/             launch checklist, egress validation, April 2026 incident bulletin,
                          and historical handoff/plan notes
```

Stack: Next.js 16 (App Router) + Supabase (`@supabase/ssr`) + Leaflet/react-leaflet + Upstash
(rate limiting, QStash) + Resend (email) + Cloudflare Turnstile + Sentry + react-hook-form +
next-intl.

## Current state (updated 2026-10-02)

The October 2026 technical audit was checked against the code; the results are in
`docs/REPO_GUIDE.md` (how it works) and `docs/ROADMAP.md` (what's open). The full audit,
including the security assessment kept out of this public repo, is in the club's Google Drive:
[Technical docs - Oct 2026](https://drive.google.com/drive/folders/1Jt7amThKNkeVJenksPtA87cBtR-nwZiq)
(access-restricted).

### Earlier notes (2026-08-14)


- **Migrations were at v31 then (v34 now)**, not v23 — confirmed directly against
  `yoyomap/supabase/migrations/`. This matters because `.github/claude-code-plan-yoyo-player-map.md` (copy in `yoyomap/docs/`)
  (a Claude Code task plan) still describes the repo as being at v23→v24 in its "Repo context"
  section, even though its own Status block (added 2026-08-10) already flags itself as stale.
  **Don't trust that plan doc's Phase 1-3 content as current state without re-checking against
  real migration history and app code first** — Phase 4 (the events app, coordinating with
  `dmvt-event-hub` via shared Supabase `entries`/`auth` tables and new
  `events`/`event_attendees`/`event_hosts` tables) and Phase 5 (optional Supabase Realtime) are
  the parts of that plan still likely relevant; Phases 1-3 may already be done, done
  differently, or superseded.
- This work is sequenced **last** of three active efforts per Brandon's 2026-08-10 call (after
  Local-AI infra, then Mission Control) — see
  `/var/mnt/shared/GIT/mission-control/Mission_Control_Planning_Roadmap.md` for the current,
  since-updated sequencing before assuming this is still queued last.
- Live PR/CI activity is real and current (dependency bumps, security-patch fixes for a vite
  fs.deny bypass and a `ws` vulnerability, validation-error fixes) — this is an actively
  maintained repo, not dormant, even though the events-app *expansion* work is queued.

## Rules worth knowing before editing

- Migrations are forward-only and numbered — never edit a shipped migration.
- Every new table needs RLS policies in the same migration that creates it.
- Do **not** make `entries.email` unique — multi-entity per email is intentional.
- Do **not** introduce `border-radius` or `box-shadow` — sharp corners are brand (see
  `.agents/AGENTS.md`'s design-system section for the full rule set).
- `/map` is `force-static`; freshness comes from `revalidatePath` in write APIs — preserve
  those calls.

## Verify

```bash
cd yoyomap
pnpm install --ignore-workspace
pnpm typecheck && pnpm lint && pnpm test && pnpm i18n:parity --strict && pnpm build
```
