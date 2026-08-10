# Claude Code Plan — yoyo-player-map

> Hand this file to Claude Code one task at a time. Each task names its branch, files, steps, acceptance criteria, and commit message.

## Status (2026-08-10)

**Stale — audit before resuming.** This doc's "Repo context" section below says migrations
are at v23, next is v24. The actual repo is at **v31** as of 2026-08-10 — real work has
moved well past what this plan describes. Phase 1–3 content here may already be done, done
differently, or superseded; don't trust it as current state without checking the real
migration history and current app code first.

**Priority: queued last** of three active efforts, per Brandon's explicit 2026-08-10 call —
after Local-AI infra (MCP servers first) and Mission Control. See
`mission-control/Mission_Control_Planning_Roadmap.md`'s Status block for the full
sequencing and reasoning. Phase 4 (the events app, coordinating with `dmvt-event-hub` via
shared Supabase `entries`/`auth` and new `events`/`event_attendees`/`event_hosts` tables)
and Phase 5 (optional Supabase Realtime map updates) are the parts of this plan still
actually relevant when this gets picked back up — audit and likely rewrite Phases 1-3
against real current state first.

## Repo context

- **Path:** `C:\GIT\yoyo-player-map`
- **App root:** `yoyomap/` (Next.js 15 + Tailwind + Supabase + Leaflet + next-intl)
- **Live:** https://yoyo-player-map.vercel.app
- **Migrations:** `yoyomap/supabase/migrations/v*.sql` — currently at v23, next is v24
- **Locales:** `yoyomap/messages/*.json` (11 locales: en, es, fr, de, pt, ja, ko, zh, ar, ru, hi)
- **Commit format:** `feat(scope):` / `fix(scope):` / `chore(scope):` / `docs:`
  - Suggested scopes: `map`, `submit`, `admin`, `taxonomy`, `i18n`, `players`, `db`, `for-hire`

## Workflow rules

1. Read the file before editing it
2. After every change set: `pnpm typecheck && pnpm lint`
3. Migrations are forward-only and numbered — never edit a shipped migration
4. Every new table needs RLS policies in the same migration that creates it
5. Do **not** make `entries.email` unique — multi-entity per email is intentional
6. Do **not** introduce `border-radius` or `box-shadow` — sharp corners are brand
7. `/map` is `force-static`; freshness comes from `revalidatePath` in write APIs — preserve those calls
8. One branch per task, PR to main

---

## Phase 1 — Quick wins (~1 session each)

### Task 1.1 — Add City button visibility

**Branch:** `feat/add-city-button`
**File:** `yoyomap/src/app/[locale]/submit/page.tsx` (around line 113, the `CityAutocomplete` component)

**Goal:** The current Add City affordance is `text-xs text-brand-red mt-1` — it reads as flavor text, not an action. Promote it to a real button.

**Steps:**
1. Find the `addCity` function and its rendering inside `CityAutocomplete`
2. Replace the inline link with a styled button: navy bg, cream text, sharp corners, ALL-CAPS label, `py-2 px-4` minimum
3. When `isNew` is true, render a small helper line above: "Don't see your city?"
4. Ensure the button is visually distinct from autocomplete list items so users don't confuse them
5. Externalize the strings to `messages/en.json`: `submit.addCityHint`, `submit.addCityButton` ("Add {city}"), `submit.addCityAdding` ("Adding...")
6. Use `useTranslations()` to consume them

**Acceptance:**
- Button is at least 44px tall on mobile (touch target)
- No `rounded-*` or `shadow-*` classes
- `pnpm typecheck && pnpm lint` clean
- Visual verification: take a screenshot at 360px width and at desktop

**Commit:** `feat(submit): make Add City a prominent button`

---

### Task 1.2 — i18n parity audit script

**Branch:** `chore/i18n-parity`
**Files:** new `yoyomap/scripts/i18n-parity.mjs`, edit `yoyomap/package.json`

**Goal:** Print which keys are missing in each locale relative to `en.json` so we can decide finish-vs-abandon.

**Steps:**
1. Create `scripts/i18n-parity.mjs` using only Node built-ins (`fs`, `path`)
2. Walk `messages/en.json` recursively to flatten dotted-key list
3. For each non-en file, compute missing keys + completion %
4. Output table: `locale | total | present | missing | %`
5. Add `--strict` flag that exits 1 if any non-en locale < 95%
6. Add `"i18n:parity": "node scripts/i18n-parity.mjs"` to package.json scripts

**Acceptance:**
- `pnpm i18n:parity` runs in <2s
- Output is paste-able into a PR description
- Empty values (`""`) count as missing
- No runtime behavior change

**Commit:** `chore(i18n): add parity audit script`

---

## Phase 2 — Unified taxonomy system

> **Decisions locked in (2026-05-09):**
> 1. Tag filters appear on `/players` too, mirroring map filter behavior.
> 2. For Hire is **self-attest** in v1 — no admin-gated badge, no verification step.
> 3. Contact preference is per-entry. Owner picks one of: relay form (default), external link, or direct email display.
> 4. City-level privacy is preserved across the board — For Hire does **not** unlock exact location.

### Task 2.1 — Schema migration v24: taxonomy tables

**Branch:** `feat/taxonomy-schema`
**File:** new `yoyomap/supabase/migrations/v24_entry_tags.sql`

**Goal:** One primitive (`entry_tags` + `tag_catalog`) that powers skill toys, For Hire, Artist, Maker, and any future tag-style features.

**Steps:**
1. Create `tag_catalog`:
   ```sql
   create table public.tag_catalog (
     category   text not null,
     value      text not null,
     label_en   text not null,
     sort_order integer not null default 0,
     is_active  boolean not null default true,
     created_at timestamptz not null default now(),
     primary key (category, value)
   );
   ```
2. Seed:
   - `skill_toy`: yoyo, kendama, diabolo, juggling, footbag, spintop, contact, levistick, magic
   - `for_hire`: local, regional, national, global
   - `artist`: photographer, illustrator, videographer, designer
   - `maker`: wood, metal, plastic, resin, hybrid
3. Create `entry_tags`:
   ```sql
   create table public.entry_tags (
     entry_id uuid not null references public.entries(id) on delete cascade,
     category text not null,
     value    text not null,
     created_at timestamptz not null default now(),
     primary key (entry_id, category, value),
     foreign key (category, value) references public.tag_catalog (category, value)
   );
   ```
4. Index on `(category, value)` for filter queries
5. RLS:
   - `entry_tags` SELECT: anon allowed only when joined entry is in `map_entries` view
   - `entry_tags` INSERT/DELETE: only by entry owner (match the existing email-claim pattern from other entry-owner policies)
6. Update `map_entries` view to include `tags jsonb` aggregated as `{ category: [values] }`
7. Re-grant `SELECT ON map_entries TO anon, authenticated`

**Acceptance:**
- Migration applies cleanly to a fresh Supabase
- `select tags from map_entries limit 1` returns a jsonb object
- Anon cannot insert into `entry_tags`
- Owner can add/remove tags only on their own entries

**Commit:** `feat(db): v24 entry_tags + tag_catalog with RLS`

---

### Task 2.2 — Admin tag catalog editor

**Branch:** `feat/admin-tag-catalog`
**Files:** `src/app/[locale]/admin/page.tsx`, new `src/app/api/admin/tag-catalog/route.ts`

**Goal:** Add/disable tag values without code deploys.

**Steps:**
1. New admin section "Tag Catalog" with category tabs (skill_toy / for_hire / artist / maker)
2. CRUD endpoints under `/api/admin/tag-catalog`:
   - `GET` — list all
   - `POST` — create new value (admin password gate, mirror existing admin route auth)
   - `PATCH` — toggle `is_active` or update label/sort_order
3. After mutation, call `/api/revalidate-map`
4. Admin UI: list + inline edit + add-row form per tab

**Acceptance:**
- Adding a new skill toy doesn't require redeploy
- Disabling a value hides it from submit/profile UI but preserves existing entry_tags rows
- Same admin-password gating as `/api/admin/data`

**Commit:** `feat(admin): tag catalog editor`

---

### Task 2.3 — Submit + profile tag UI

**Branch:** `feat/submit-tags`
**Files:** `src/app/[locale]/submit/page.tsx`, `src/app/[locale]/profile/page.tsx`, `src/app/api/submit/route.ts`, `src/app/api/profile/update/route.ts`

**Goal:** Let users select tags when adding/editing their entry.

**Steps:**
1. On form mount, fetch `tag_catalog where is_active = true` grouped by category
2. UI per category:
   - `skill_toy`: multi-select checkbox group
   - `for_hire`: scope radio (none/local/regional/national/global) — single-select; **self-attest only, no admin gating in v1**
   - `artist`: multi-select
   - `maker`: multi-select
3. Server-side validate every submitted tag against `tag_catalog` — reject unknown
4. On insert/update, replace the entry's tag set transactionally (delete-then-insert in one tx)
5. Existing entries without tags must still validate

**Acceptance:**
- New person submission persists tags
- Editing profile shows existing tags pre-checked
- Server returns 400 for an unknown tag value
- Person, shop, and club all support tags

**Commit:** `feat(submit): tag selection UI for skill toys / for-hire / artist / maker`

---

### Task 2.4 — Map filter + popup display

**Branch:** `feat/map-tag-filters`
**Files:** `src/app/[locale]/map/MapClient.tsx`, `src/app/[locale]/map/Map.tsx`, `src/app/[locale]/map/page.tsx`, `src/app/[locale]/players/EntryList.tsx`, `src/app/[locale]/players/PlayersTable.tsx`

**Goal:** Filter pins + table rows by tag; show tags in popups.

**Steps:**
1. Extend `MapEntry` interface in `map/page.tsx` to include `tags: Record<string, string[]>`
2. Update lean `getEntries` SELECT to include `tags`
3. Add tag filter UI in `MapClient` filter panel — collapsible per category
4. Filter rule: AND across categories, OR within a category
5. Encode active filters in URL: `?tags=skill_toy:kendama,skill_toy:juggling,for_hire:regional`
6. Mirror filter UI in `/players` table
7. Tag chips in popup: small navy chips, sharp corners, no shadow

**Acceptance:**
- Filtering by `kendama` only shows kendama-tagged pins
- Multi-tag URL state survives reload
- Players table filters in sync
- No regression in existing entity-type filter

**Commit:** `feat(map): tag-based filters + popup chips`

---

### Task 2.5 — Contact preference + For-Hire relay

**Branch:** `feat/for-hire-contact`
**Files:** new `src/app/api/contact-entry/route.ts`, new `src/app/[locale]/contact-entry/[id]/page.tsx`, new migration `v25_contact_preference.sql`, edits to submit/profile/map popup

**Goal:** Owners pick how they want to be reached. Default protects email; opt-in to share more.

**Steps:**
1. v25 migration: add to `entries`:
   ```sql
   alter table public.entries
     add column contact_preference text not null default 'form'
       check (contact_preference in ('form','external_link','direct_email','off')),
     add column contact_url text,        -- when preference = 'external_link'
     add column contact_email text;      -- when preference = 'direct_email' (defaults to entries.email if null at write time, owner-overridable)
   ```
   Add a CHECK that `external_link` requires `contact_url is not null` and `direct_email` requires either `contact_email` set or fallback to `entries.email` at read time in the view.
2. Update `map_entries` view to expose `contact_preference`, `contact_url`, and `contact_display` (computed: `contact_email` if set, else `entries.email` only when preference = `direct_email`, else null). Re-grant SELECT.
3. Submit + profile UI: radio group with the four options + conditional inputs (URL field for external_link, optional email override for direct_email)
4. Build `/contact-entry/[id]` relay page — used when preference = `form`. Form fields: from-email, subject, message, honeypot.
5. POST `/api/contact-entry` validates entry is visible + preference = `form`, rate-limits 3/IP/day, sends via Resend to `entries.email`, logs to `email_send_log`. Owner's email never appears in HTML or network response in this path.
6. Map popup "Contact" button branches by preference:
   - `form` → `/contact-entry/[id]`
   - `external_link` → opens `contact_url` in new tab (rel=noopener)
   - `direct_email` → mailto link to `contact_display`
   - `off` → button hidden
7. Apply this to all entries, not just For Hire — useful for shops, clubs, and players who want commissions/contact.

**Acceptance:**
- Default-preference entries leak no email anywhere
- `direct_email` entries show the email only when owner opted in
- `external_link` validates URL is http(s) and not a relay-bypass
- Rate limit returns 429 after the third relay submit per IP per day
- `email_send_log` row created on successful relay send
- City-level coords unchanged regardless of contact preference

**Commit:** `feat(contact): per-entry contact preference (form/link/email/off)`

---

## Phase 3 — Tedious finish work (interleave with Phase 2)

### Task 3.1 — i18n locale gating

**Branch:** `feat/i18n-locale-gating`
**Files:** new `yoyomap/messages/_meta.json`, edits to wherever the locale picker is rendered (likely `Navigation.tsx`) and middleware/i18n config

**Goal:** Ship only locales that are actually complete. Use Task 1.2 output to populate `_meta.json`.

**Steps:**
1. `_meta.json` shape: `{ "complete": ["en"], "beta": ["es", "ja"] }`
2. Locale picker shows only `complete` by default; `?showBeta=1` reveals beta
3. Hitting a non-complete locale URL still works but with en fallback for missing keys (next-intl already does this — verify)
4. Plan: graduate locales as `pnpm i18n:parity` shows 100%

**Acceptance:**
- Selector lists only complete locales
- `/de/map` still renders (no 404)

**Commit:** `feat(i18n): gate locale picker by completeness`

---

### Task 3.2 — Legacy data location-status tracking

**Branch:** `feat/location-status-tracking`
**Files:** new migration `v26_location_status.sql`, admin UI updates, new email template

**Goal:** Stop ad-hoc-tracking the long-tail bad locations. Make it a column.

**Steps:**
1. v26 migration: add `entries.location_status` text check in (`verified`, `auto_geocoded`, `needs_research`, `awaiting_owner_response`, `dead_pin`) default `'auto_geocoded'`
2. Admin UI: filter chip + bulk-set action
3. Outreach: new Resend template "Confirm your city" with magic link
4. Magic link route at `/confirm-location/[token]` lets owner confirm or update without re-verifying email
5. Clicking link sets status to `verified`

**Acceptance:**
- Admin sees a count by status at a glance
- Outreach email lands (test with three providers)
- Owner click confirms in <3s
- Audit row in `email_send_log`

**Commit:** `feat(admin): location status tracking + outreach`

---

## Phase 4 — Events app (separate repo)

Lives in `dmvt-event-hub`. Out of scope for this plan but coordinate:

1. Same Supabase project — share `entries`, `auth`, RLS
2. New tables: `events`, `event_attendees`, `event_hosts`
3. `event_hosts.entry_id` FK back to `entries.id` — only `entity_type in ('club','shop')` can host
4. Map popup: "Upcoming events at this club" link out to `events.dmvthrowers.club`
5. Events page: link back to host's pin

Open a separate plan doc when ready. Defer until Phase 2 ships.

---

## Phase 5 — Optional: true live map updates

If/when warranted. Half-day.

**Branch:** `feat/realtime-map`
**File:** `src/app/[locale]/map/MapClient.tsx`

**Steps:**
1. Keep static initial render
2. `useEffect` opens a Supabase Realtime channel on `map_entries`
3. Merge inserts/updates/deletes into client state
4. No re-fetch — channel feeds the diff

**Acceptance:**
- Open tab on /map shows new pin within 10s of verification, no reload
- No double-counting on first paint

**Commit:** `feat(map): realtime tile updates`

---

## Decisions log (locked in 2026-05-09)

1. **Tag filters on /players** — yes, mirror map filter behavior. Captured in Task 2.4.
2. **For Hire verification** — self-attest only in v1. No admin badge. May revisit later. Captured in Task 2.3.
3. **Contact mechanism** — per-entry preference: relay form (default), external link, or direct email. New `off` option hides the contact button entirely. Captured in Task 2.5.
4. **Privacy promise** — city-level coordinates apply to everyone, including For Hire entries. No exact-location override. Captured in Task 2.5 acceptance.

---

## How to drive this with Claude Code

```bash
cd C:\GIT\yoyo-player-map
git checkout -b <task branch>
claude
> Read the plan at docs/claude-code-plan.md and execute Task 1.1
```

After each task: review diff, run `pnpm typecheck && pnpm lint`, smoke test locally, push, open PR.

If a task gets stuck, drop back here and we'll re-plan.
