# AGENTS.md — yoyo-player-map

Orientation for any AI agent (Claude, Codex, or otherwise) landing in this repo cold.

## What this is

The public player/club/shop map for DMV Throwers Yo-Yo & Skill Toy Club — live at
[dmvthrowers.club](https://dmvthrowers.club) (target: `map.dmvthrowers.club`). Privacy-first by
design: players submit a display name + city and appear as a jittered pin (~10 mile blur); only
shops/clubs that opt in get a precise location. No accounts, no messaging, no GPS, no data
sales — that's a product constraint, not just a README claim, so don't add anything that would
narrow the blur radius or expose exact locations without deliberately revisiting that design.

**There's already a broader, cross-repo maintainer doc**: `.agents/AGENTS.md` in this repo
covers dmvthrowers.github.io, this repo, `dmvt-event-hub`, and `DMVT-Design` together (brand
voice, color/typography system, contact info, cross-repo workflows). Read it too — this file
only covers what's specific to *this* repo. Note: that file says "Next.js 14" for this repo;
the real version is Next.js 15 (`git log`: "Pin yoyomap to Next.js 15" — a stale detail worth
fixing if you're in `.agents/AGENTS.md` for another reason, not fixed here to stay in scope).

## Layout

```
yoyomap/                 the actual app -- standalone pnpm project, NOT part of the root workspace
yoyomap/src/app/          Next.js 15 App Router
yoyomap/supabase/migrations/   v2 through v31 (forward-only, never edit a shipped one)
yoyomap/messages/         next-intl locale files (11 languages: en es fr de pt ja ko zh ar ru hi)
yoyomap/components/, lib/ shared UI + Supabase client code
scripts/                  standalone TS utilities (e.g. location-data fixes)
skills/, .agents/         agent skill definitions for AI-assisted maintenance (see above)
docs/                     VSYC26_Registration_Phase2_Handoff.md and similar handoff notes
```

Stack: Next.js 15 (App Router) + Supabase (`@supabase/ssr`) + Leaflet/react-leaflet + Upstash
(rate limiting) + Resend (email) + react-hook-form + next-intl.

## Current state (verified 2026-08-14, not assumed)

- **Migrations are at v31**, not v23 — confirmed directly against
  `yoyomap/supabase/migrations/`. This matters because `.github/claude-code-plan-yoyo-player-map.md`
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
pnpm install
pnpm typecheck && pnpm lint && pnpm build
```
