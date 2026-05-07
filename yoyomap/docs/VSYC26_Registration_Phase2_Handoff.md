# VSYC-26 Registration — Phase 2 Handoff Doc

**For:** Claude Code (or future contributor)
**From:** Phase 1 orchestration session, May 7, 2026
**Owner:** Brandon Rogers (Event Director)
**Event:** Sept 19, 2026 · Dulles Town Center, Sterling VA
**Days to event at handoff:** 135

---

## TL;DR — what you're building

A standalone Next.js 15 + Supabase + Resend registration app at **`register.dmvthrowers.club`** that:

1. Collects competitor registrations with division selection, music upload, waivers, and optional merch
2. Calculates fees server-side (combo discount + early bird stack + comp-code overrides + walk-up surcharge)
3. Stores registrations + MP3s in an isolated Supabase project
4. Sends Resend confirmation emails
5. Provides an admin dashboard for marking paid / music received / CSV export

Spectator side is **already done** — handled by Ticket Tailor (see Phase 1 status below).

---

## Phase 1 status (DONE — do not duplicate)

Spectator RSVP lives on Ticket Tailor under the existing **DMV Throwers store** (`st_81598`).

| Item | ID | Status |
|---|---|---|
| Event series: "VSYC-26 — Spectator RSVP" | `es_2204711` | DRAFT (publish from dashboard) |
| Occurrence: Sept 19, 2026, 11 AM–6 PM ET | `ev_8229790` | active |
| Ticket type: Free Spectator RSVP, $0, 250 cap | `tt_6337573` | on sale |
| Public URL once published | https://buytickets.at/dmvthrowers/2204711 | — |

**Two manual Ticket Tailor steps still pending (Brandon):**
- Add CoC required multi-checkbox in Settings → Checkout Forms (API doesn't support create)
- Toggle DRAFT → PUBLISHED

Do not touch the spectator side from the new app. Just link to the public URL from the hub page.

---

## Locked decisions

### Divisions (Fixed Axle hidden for 2026)
- **1A** — $25
- **X Division** — $20 (sub-radio: 2A / 3A / 4A / 5A)
- **Sport / Beginner / Junior** — $15 (single division, no sub-style)

### Pricing rules (apply in this order, server-side)
1. **Comp code present + valid** → fee = $0, skip all other rules
2. **Combo discount**: if both 1A AND X selected → those two count as $40 (saves $5). SBJ adds $15 on top.
3. **Early bird**: if registration date < **June 1, 2026 00:00 ET** → subtract $5 from total (stackable with combo). Floor at $0.
4. **Walk-up surcharge**: if `registration_source` ∈ {`walk_up`, `late_email`} → add $10.

| Selection | Standard | Early Bird | Walk-up | Combo+EB |
|---|---|---|---|---|
| 1A | $25 | $20 | $35 | — |
| X | $20 | $15 | $30 | — |
| SBJ | $15 | $10 | $25 | — |
| 1A + X | $40 | $35 | $50 | $35 |
| 1A + X + SBJ | $55 | $50 | $65 | $50 |
| Any + valid comp code | $0 | $0 | $0 | $0 |

### Registration windows
- **Soft launch** (test): May 25–31 (BMore + DMV regulars only, unlisted URL)
- **Public open**: June 1, 00:00 ET (early bird ends here if shipped before; otherwise launches at standard)
- **Online cutoff**: Sun Sept 13, 23:59 ET
- **Late-email window**: Sept 14–18 → email `dmvthrowers@gmail.com`, manual admin entry, +$10
- **Walk-up window**: Sept 19, 10:00–11:00 AM ET, tablet at check-in, +$10
- **Hard close**: Sept 19, 11:00 AM ET

### Minors
- Cutoff: **under 18**
- No min/max age otherwise — anyone can compete
- Required if minor: parent_name, parent_email, parent_consent_checkbox
- Form should compute `is_minor = (age_on_event < 18)` on the fly and reveal parent block

### Code of Conduct (mandatory for all)
- Presentation: **Option C** — short summary visible by default + expandable inline panel with full text + link to `dmvthrowers.club/vsyc26-rules.html`
- Required checkbox below: "I agree to the VSYC-26 Code of Conduct..."
- Same checkbox on Ticket Tailor spectator side (Brandon adds manually per Phase 1 handoff)

### Three required waivers for competitors
1. Liability release
2. Photo/video consent
3. Code of Conduct agreement

All three required to submit. Form should not allow submission without all three checked.

### Music upload
- Accepted: `.mp3`, `.wav`, `.m4a`
- Max size: **128 MB**
- Filename enforced server-side: `{DIVISION}_{LastName}_{FirstName}.{ext}` (e.g. `1A_Rogers_Brandon.mp3`)
- Multi-division players upload one file per division (or rename their submission to match the first division and we duplicate at admin)
- Music NOT collected at form submit time — confirmation email contains an upload link to a separate `/upload?token=...` route. This avoids 128MB form posts and lets people register first, find their music later.
- Hard deadline: Sept 12, 2026, 23:59 ET
- Storage bucket: `vsyc26-music` (private, service-role write only)

### Comp codes
Initial seed (configurable in admin later):
- `VOLUNTEER26` — 100% off, max 20 uses, expires Sept 12
- `SPONSOR26` — 100% off, max 10 uses, expires Sept 12
- `FRESHLY_DIRTY_TEAM` — 100% off, max 2 uses (Diamond sponsor entitlement)
- Future: one per Platinum sponsor (max 2 each)

---

## Architecture

```
dmvthrowers.club/vsyc26-register.html  (existing static hub on GitHub Pages)
   ├─► Spectators ──────► https://buytickets.at/dmvthrowers/2204711  (Ticket Tailor)
   ├─► Competitors ─────► register.dmvthrowers.club  (THIS BUILD)
   └─► Vol/Sponsored ───► register.dmvthrowers.club  (same form, comp code)

register.dmvthrowers.club  (NEW Vercel Hobby project)
   └─► Supabase project: vsyc26  (NEW, isolated from yoyo-player-map)
        ├─ Postgres: vsyc_registrations, vsyc_comp_codes, vsyc_audit_log
        └─ Storage: vsyc26-music bucket (private)
   └─► Resend: dmvthrowers.club domain (or vsyc.dmvthrowers.club subdomain)
        Sender: vastateyoyocontest@dmvthrowers.club
```

### Why isolated from yoyo-player-map
Brandon explicitly wants logical separation. Map = year-round community service; contest = annual ramp + launch spike. Independent blast radius, independent change cadence, independent free-tier quotas. Cost is the same ($0).

---

## Recommended repo structure

New GitHub repo: **`dmvthrowers/vsyc26-registration`**

```
vsyc26-registration/
├── README.md                       (link to this handoff doc)
├── .env.local.example
├── package.json                    (Next.js 15, TS, Tailwind)
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts              (DMV brand tokens — see brand section)
├── supabase/
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql
│   │   ├── 0002_storage_buckets.sql
│   │   └── 0003_seed_comp_codes.sql
│   └── README.md
├── lib/
│   ├── supabase/
│   │   ├── client.ts              (anon, browser-safe)
│   │   └── admin.ts               (service role, server-only)
│   ├── pricing.ts                  (the calculateFee logic — unit testable)
│   ├── validation.ts               (zod schemas for form input)
│   ├── filename.ts                 (DIVISION_Last_First.{ext} enforcement)
│   ├── rate-limit.ts               (copy from yoyo-player-map)
│   ├── email.ts                    (Resend wrapper)
│   ├── tokens.ts                   (signed upload tokens for music)
│   └── audit.ts                    (audit_log writer)
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    (registration form — main entry)
│   ├── confirm/page.tsx            (post-submit thank you + payment instructions)
│   ├── upload/page.tsx             (music upload via signed token)
│   ├── admin/
│   │   ├── layout.tsx              (basic auth middleware)
│   │   ├── page.tsx                (registrations table)
│   │   └── codes/page.tsx          (comp code management)
│   └── api/
│       ├── register/route.ts       (POST: create registration)
│       ├── upload/route.ts         (POST: receive music file)
│       ├── admin/
│       │   ├── mark-paid/route.ts
│       │   ├── mark-music/route.ts
│       │   └── export-csv/route.ts
│       └── health/route.ts
├── components/
│   ├── form/
│   │   ├── PlayerInfoSection.tsx
│   │   ├── DivisionsSection.tsx
│   │   ├── MinorConsentSection.tsx
│   │   ├── MerchSection.tsx
│   │   ├── WaiversSection.tsx
│   │   ├── PricingSummary.tsx
│   │   └── PaymentInstructions.tsx
│   ├── CodeOfConductPanel.tsx
│   └── ui/                         (Tailwind primitives)
└── emails/
    ├── ConfirmationEmail.tsx       (React Email or HTML template)
    ├── PaymentReminderEmail.tsx
    └── MusicReceivedEmail.tsx
```

---

## Database schema (initial migration)

```sql
-- 0001_initial_schema.sql

-- ========== ENUMS ==========
create type registration_source as enum ('online', 'late_email', 'walk_up', 'soft_launch');
create type payment_method as enum ('venmo', 'paypal', 'check', 'cash', 'comp', 'pending');
create type division_code as enum ('1A', 'X', 'SBJ');
create type x_substyle as enum ('2A', '3A', '4A', '5A');

-- ========== COMP CODES ==========
create table vsyc_comp_codes (
  code text primary key,
  description text not null,
  max_uses int not null default 1,
  uses_count int not null default 0,
  expires_at timestamptz not null default '2026-09-12 23:59:59-04',
  created_at timestamptz not null default now(),
  active boolean not null default true
);

-- ========== REGISTRATIONS ==========
create table vsyc_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Player info
  first_name text not null,
  last_name text not null,
  preferred_bracket_name text,        -- optional override for bracket display
  age_on_event int not null,
  pronouns text,
  email text not null,
  phone text not null,
  city text not null,
  state text not null,
  club_affiliation text,

  -- Minor consent
  is_minor boolean generated always as (age_on_event < 18) stored,
  parent_name text,
  parent_email text,
  parent_consented boolean default false,

  -- Divisions
  divisions division_code[] not null check (array_length(divisions, 1) >= 1),
  x_substyle x_substyle,              -- required if 'X' in divisions
  combo_applied boolean not null default false,

  -- Pricing
  comp_code text references vsyc_comp_codes(code),
  early_bird_applied boolean not null default false,
  walk_up_surcharge boolean not null default false,
  fee_cents int not null,
  registration_source registration_source not null default 'online',

  -- Music
  music_path text,                    -- e.g. 'vsyc26-music/1A_Rogers_Brandon.mp3'
  music_filename text,                -- enforced filename
  music_uploaded_at timestamptz,
  music_upload_token text unique,     -- signed token for the /upload route

  -- Waivers (all required true to submit)
  liability_waiver_accepted boolean not null,
  photo_video_consent boolean not null,
  code_of_conduct_accepted boolean not null,

  -- Optional
  emergency_contact_name text,
  emergency_contact_phone text,
  volunteer_interest boolean default false,
  accessibility_needs text,
  merch_order jsonb,                  -- [{type:'tshirt', size:'L', qty:1, price_cents:2000}, ...]
  merch_total_cents int default 0,

  -- Admin
  paid boolean not null default false,
  paid_at timestamptz,
  payment_method payment_method default 'pending',
  bracket_seed int,                   -- assigned post-cutoff
  admin_notes text,

  -- Audit
  ip_address inet,
  user_agent text,

  -- Constraints
  constraint minor_requires_parent check (
    (is_minor = false) or
    (parent_name is not null and parent_email is not null and parent_consented = true)
  ),
  constraint x_requires_substyle check (
    not ('X' = any(divisions)) or x_substyle is not null
  ),
  constraint waivers_required check (
    liability_waiver_accepted = true
    and photo_video_consent = true
    and code_of_conduct_accepted = true
  )
);

create index idx_vsyc_email on vsyc_registrations (lower(email));
create index idx_vsyc_paid on vsyc_registrations (paid);
create index idx_vsyc_created on vsyc_registrations (created_at desc);
create index idx_vsyc_divisions on vsyc_registrations using gin (divisions);

-- updated_at trigger
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger vsyc_registrations_updated_at
  before update on vsyc_registrations
  for each row execute function set_updated_at();

-- ========== AUDIT LOG ==========
create table vsyc_audit_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  registration_id uuid references vsyc_registrations(id) on delete set null,
  actor text not null,                -- 'system', 'admin:brandon', etc.
  action text not null,               -- 'created', 'marked_paid', 'music_received', 'walk_up_added'
  details jsonb
);

create index idx_audit_registration on vsyc_audit_log (registration_id);
create index idx_audit_created on vsyc_audit_log (created_at desc);

-- ========== RLS ==========
alter table vsyc_registrations enable row level security;
alter table vsyc_comp_codes enable row level security;
alter table vsyc_audit_log enable row level security;

-- Service role bypasses RLS automatically. Anon role gets nothing.
create policy "service_role_all_registrations" on vsyc_registrations
  for all using (auth.role() = 'service_role');
create policy "service_role_all_codes" on vsyc_comp_codes
  for all using (auth.role() = 'service_role');
create policy "service_role_all_audit" on vsyc_audit_log
  for all using (auth.role() = 'service_role');
```

```sql
-- 0002_storage_buckets.sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vsyc26-music',
  'vsyc26-music',
  false,
  134217728,  -- 128 MB
  array['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a']
);

-- Only service role can read/write
create policy "service_role_music" on storage.objects
  for all using (auth.role() = 'service_role' and bucket_id = 'vsyc26-music');
```

```sql
-- 0003_seed_comp_codes.sql
insert into vsyc_comp_codes (code, description, max_uses) values
  ('VOLUNTEER26', 'Volunteer comp pass', 20),
  ('SPONSOR26', 'Generic sponsor comp pass', 10),
  ('FRESHLY_DIRTY_TEAM', 'Diamond sponsor: Freshly Dirty - 2 free passes', 2);
```

---

## API contract

### `POST /api/register`

**Request body** (validated with zod):
```typescript
{
  // Player
  first_name: string,           // 1-50 chars
  last_name: string,            // 1-50 chars
  preferred_bracket_name?: string,
  age_on_event: number,         // 1-120
  pronouns?: string,
  email: string,                // valid email
  phone: string,                // E.164 or US format
  city: string,
  state: string,                // 2-letter
  club_affiliation?: string,

  // Minor (required if age_on_event < 18)
  parent_name?: string,
  parent_email?: string,
  parent_consented?: boolean,

  // Divisions
  divisions: ('1A' | 'X' | 'SBJ')[],   // min 1
  x_substyle?: '2A' | '3A' | '4A' | '5A',

  // Comp code
  comp_code?: string,

  // Waivers (all required true)
  liability_waiver_accepted: true,
  photo_video_consent: true,
  code_of_conduct_accepted: true,

  // Optional
  emergency_contact_name?: string,
  emergency_contact_phone?: string,
  volunteer_interest?: boolean,
  accessibility_needs?: string,
  merch_order?: MerchItem[]
}
```

**Server-side flow:**
1. Rate limit check (3 per IP per hour)
2. Validate with zod
3. If `comp_code` present → look up in `vsyc_comp_codes`, verify `active`, `uses_count < max_uses`, `expires_at > now()`
4. Calculate `fee_cents` per pricing rules above
5. Determine `registration_source` (default `online`; admin endpoint sets `late_email` or `walk_up`)
6. Generate `music_upload_token` (signed, expires Sept 12 23:59 ET)
7. Insert into `vsyc_registrations`
8. If comp_code used → increment `uses_count`
9. Insert audit row: `actor='system'`, `action='created'`
10. Send Resend confirmation email
11. Return `{ id, fee_cents, payment_instructions, music_upload_url, confirm_url }`

**Response (success):**
```typescript
{
  id: string,
  fee_cents: number,
  is_comp: boolean,
  payment_instructions: {
    venmo: '@DMVThrow',
    paypal: 'paypal.biz/Dmvthrowers',
    check_payable_to: 'DMV Throwers',
    note_format: 'VSYC26-{lastname}-{first}',
  },
  music_upload_url: string,    // signed link
  confirm_url: string
}
```

### `POST /api/upload`

Multipart form, with `?token={music_upload_token}`.
- Look up registration by token
- Validate file (mime, size)
- Compute filename: `{DIVISION}_{LastName}_{FirstName}.{ext}` (use first division if multi)
- Upload to `vsyc26-music/` bucket
- Update registration: `music_path`, `music_filename`, `music_uploaded_at`
- Audit: `action='music_received'`
- Send Resend "music received" email

### `GET /api/admin/export-csv`

Behind basic auth. Returns CSV with columns:
`id, created_at, last_name, first_name, preferred_bracket_name, age_on_event, divisions, x_substyle, fee_cents, paid, payment_method, comp_code, music_filename, music_received, email, phone, parent_email, registration_source, bracket_seed, admin_notes`

This drops directly into the judges' scoring template.

---

## Form UX requirements

- **Single page**, sectioned, mobile-first
- **Pricing summary sticky** at bottom on mobile, side panel on desktop — updates live as user clicks divisions / enters comp code / hits early-bird date
- **Comp code field** with "Apply" button → server-side validate via lightweight `/api/validate-code` endpoint → show "✓ Valid" or "✗ Invalid" inline
- **Minor section** appears conditionally when `age_on_event < 18`
- **X sub-style radio** appears conditionally when X selected
- **CoC panel** (Option C):
  ```
  ┌─ CODE OF CONDUCT ─────────────────────────────┐
  │ Summary text — 2-3 sentences plain language.  │
  │                                               │
  │ ▾ Read full Code of Conduct                   │ <- expandable
  │ → Or read on the website ↗                    │
  │                                               │
  │ ☐ I agree to the VSYC-26 Code of Conduct.    │ <- required
  │   I understand violations may result in       │
  │   removal from the venue and a ban from       │
  │   future DMV Throwers events. This applies    │
  │   to all attendees regardless of status,      │
  │   sponsorship, or affiliation.                │
  └───────────────────────────────────────────────┘
  ```
- **Submit button** disabled until all required fields valid + all 3 waivers checked
- **Honeypot field** (hidden, must be empty — copy from yoyo-player-map pattern)
- **After submit** → redirect to `/confirm?id={id}` with payment instructions, music upload link, calendar.ics download

---

## Email templates (Resend)

### 1. ConfirmationEmail (sent on registration)
- Subject: `VSYC-26 Registration Received — {FirstName}, here's what's next`
- Body: registration summary, fee, payment instructions, music upload link, deadlines, contact info
- BCC parent_email if minor

### 2. PaymentReminderEmail (manual trigger from admin)
- Subject: `VSYC-26 Payment Reminder — {FirstName}`
- Sent if `paid = false` and `created_at > 7 days ago`

### 3. MusicReceivedEmail (sent on music upload)
- Subject: `Music received for VSYC-26 — {FirstName}`
- Confirms filename, deadline reminder if before Sept 12

---

## Brand tokens (Tailwind config)

From DMV-Design canonical:
```js
colors: {
  navy: '#1a1f36',     // VSYC primary (per memory; brand site uses #102040)
  red: '#C8102E',
  cream: '#F5F0E8',
  gold: '#C9A84C',     // VSYC accent only
}
fontFamily: {
  display: ['Montserrat', 'sans-serif'],   // VSYC uses Montserrat
  body: ['Montserrat', 'sans-serif'],
}
borderRadius: {
  DEFAULT: '0',        // sharp corners are brand
}
boxShadow: {
  none: 'none',        // no shadows on cards
}
```

Use the navy/red/cream/gold from VSYC, not the broader DMV palette. VSYC has its own treatment per memory. **Match the polish level of `vsyc26.html` on the main site** so the form feels native.

---

## Environment variables

`.env.local.example`:
```bash
# Supabase (NEW project: vsyc26)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # server-only, never exposed

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=vastateyoyocontest@dmvthrowers.club
RESEND_FROM_NAME="VSYC-26 Registration"
RESEND_REPLY_TO=dmvthrowers@gmail.com

# App
NEXT_PUBLIC_BASE_URL=https://register.dmvthrowers.club
NEXT_PUBLIC_VSYC_RULES_URL=https://dmvthrowers.club/vsyc26-rules.html
NEXT_PUBLIC_TICKET_TAILOR_SPECTATOR_URL=https://buytickets.at/dmvthrowers/2204711
NEXT_PUBLIC_CONTACT_EMAIL=dmvthrowers@gmail.com

# Admin auth
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<generate strong>     # used by middleware

# Pricing config (allows tweaking without redeploy)
EARLY_BIRD_CUTOFF_ISO=2026-06-01T00:00:00-04:00
ONLINE_REG_CUTOFF_ISO=2026-09-13T23:59:59-04:00
MUSIC_DEADLINE_ISO=2026-09-12T23:59:59-04:00

# Token signing
UPLOAD_TOKEN_SECRET=<random 32+ chars>
```

---

## Phase 2 task list (in build order)

### Setup (Day 0 — May 8)
1. Create new GitHub repo `dmvthrowers/vsyc26-registration`
2. Create new Supabase project named `vsyc26` (separate from yoyo-player-map; same org, slot 2 of 2 free projects)
3. Create new Vercel project, link to GitHub repo
4. Verify Resend sender domain (`dmvthrowers.club` or new subdomain) — add SPF/DKIM/DMARC TXT records in Porkbun
5. Add CNAME in Porkbun: `register.dmvthrowers.club` → `cname.vercel-dns.com`
6. Add domain in Vercel project settings → wait for SSL provision
7. Scaffold Next.js 15 + Tailwind + TypeScript
8. Copy lib utilities from `yoyo-player-map`: `validation.ts`, `rate-limit.ts`, `email.ts` patterns, audit pattern

### Backend (Day 1–3 — May 9–11)
9. Apply migrations 0001, 0002, 0003 to Supabase
10. Build `lib/pricing.ts` + unit tests (cover all matrix scenarios in the table above)
11. Build `lib/filename.ts` + tests (handle accented chars, hyphens, apostrophes)
12. Build `lib/tokens.ts` (HMAC-signed upload tokens with embedded registration_id + expiry)
13. Build `app/api/register/route.ts`
14. Build `app/api/upload/route.ts`
15. Build `app/api/validate-code/route.ts`
16. Build email templates + send functions

### Frontend (Day 4–6 — May 12–14)
17. Build `app/page.tsx` registration form with all sections
18. Build `app/confirm/page.tsx`
19. Build `app/upload/page.tsx`
20. Build pricing summary live-update logic
21. Build CoC panel (Option C with expandable inline)
22. Build hub page update for `dmvthrowers.club/vsyc26-register.html` (3 buttons: spectator, competitor, vol/sponsor — last two link to same form)

### Admin (Day 7–8 — May 15–16)
23. Build basic-auth middleware
24. Build `app/admin/page.tsx` with filters (division, paid, music_received), toggle buttons, search
25. Build CSV export endpoint
26. Build comp-code management page

### Soft launch (May 17–24)
27. Brandon E2E test: register self as 1A+X with `VOLUNTEER26` → fee = $0 → upload `1A_Rogers_Brandon.mp3` → verify file lands in bucket with correct name → verify Resend email arrives
28. Brandon E2E test: register self as 1A+X with no code, May date → fee = $35 (combo + early bird) → verify pricing summary matches DB
29. Soft launch to BMore + DMV regulars (unlisted URL share) — target 10 test registrations
30. Fix bugs

### Public launch (June 1)
31. Update `dmvthrowers.club/vsyc26.html` with link to registration
32. Social announcement
33. Monitor admin daily for 1 week

---

## Out of scope for Phase 2

Defer to Phase 3 (post-Sept 5) or beyond:
- Bracket seeding logic (random vs. ranked vs. manual)
- Judge scoring sheet auto-generation
- Day-of check-in app / QR scan
- Walk-up tablet UI (use existing form on iPad with `?source=walk_up` URL param + admin override)
- Late-email triage automation (Brandon does manual entry through admin)
- Sponsor-team-player auto-provisioning (Diamond/Platinum sponsors get codes via email, manual)
- Refund workflow (per memory: non-refundable except medical/cancellation; handled case-by-case via email)
- Multi-event support (architect for it, but VSYC-26 is single event)
- Public results page

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Supabase free-tier storage cap (1 GB) | 200 × 2 MB MP3s = 400 MB. Buffer fine. Add monitor alert at 800 MB. |
| Resend 100/day cap on launch day | Stagger announcement waves; soft launch absorbs 10; June 1 public launch under 100 expected. |
| Vercel 100 GB/mo bandwidth | Form is tiny. Music goes direct to Supabase Storage, not through Vercel. Fine. |
| Comp code abuse (someone shares VOLUNTEER26 publicly) | `max_uses` cap; admin can rotate codes; audit log shows misuse. |
| Bad music filename (special chars, accents) | Server-side `filename.ts` normalizes — strip diacritics, replace spaces with underscore, reject `..`/`/` |
| Form spam | Honeypot + rate-limit (3 per IP per hour) + Cloudflare Turnstile if needed |
| Day-of check-in chaos | Print roster Sept 18 evening (after late-email cutoff). Admin marks check-ins manually. Defer fancy app. |
| Domain DNS propagation delay | Add CNAME in Porkbun on Day 0, before Vercel deploy. Gives ~24hr buffer. |

---

## Success criteria for Phase 2

- [ ] Can register a competitor and have it appear in admin within 5 seconds
- [ ] Pricing matrix matches the table above for all 7 scenarios (auto test)
- [ ] Comp code overrides correctly + decrements `uses_count`
- [ ] Music uploads to bucket with enforced filename
- [ ] Resend confirmation email delivers within 30 sec
- [ ] Admin CSV export opens cleanly in Excel + Google Sheets
- [ ] Mobile (360px width) form has no horizontal scroll
- [ ] Lighthouse accessibility score ≥ 90
- [ ] All 3 waivers required; cannot submit without
- [ ] Minor block conditional on age < 18; cannot submit without parent consent
- [ ] Honeypot blocks at least 1 bot in soft-launch period

---

## Reference materials in project

- VSYC-26 sponsor package v15c (memory: v26g is current) — for brand colors, sponsor benefits inc. comp passes
- `vayoyochecklist.pdf` — registration & check-in workflow context
- `26_DTC__DMV_Throwers__Event_Agreement.pdf` — venue rules
- `Financial_Infrastructure_Guide_for_a_VolunteerRun_YoYo_Contest.pdf` — payment stack rationale (Venmo Business + PayPal + Square at door)
- `vsyc26.html` on main site — reference styling for native feel

---

## Contact / context for Code agent

- **Brandon's working style:** direct, efficiency-focused, prefers surgical fixes over rebuilds. Reviews iteratively. Doesn't need re-explanation of established context.
- **Brand non-negotiables:** sharp corners (`border-radius: 0`), no shadows on cards, all-caps nav, sentence-case body, Montserrat for VSYC.
- **DMV brand vs. VSYC brand:** DMV club uses red/navy/cream; VSYC uses navy/red/cream/gold. This app is VSYC-flavored.
- **Memory references** (per existing project memory): MC role unfilled, judges tentative, sponsor package v26g is production-ready.

---

## Open items Brandon still needs to resolve before/during Phase 2

- [ ] Add CoC required checkbox in Ticket Tailor dashboard (Phase 1 leftover)
- [ ] Toggle Ticket Tailor series DRAFT → PUBLISHED
- [ ] Confirm Resend sender domain choice: `dmvthrowers.club` shared with map vs. `vsyc.dmvthrowers.club` subdomain
- [ ] Provide final CoC text (from `vsyc26-rules.html`) for embedding in Option C panel
- [ ] Confirm merch SKUs + prices for Phase 2 (T-shirt sizes, hoodie, anything else)
- [ ] Confirm Code agent admin password (`ADMIN_PASSWORD` env var)
- [ ] Generate `UPLOAD_TOKEN_SECRET` (random 32+ chars)

---

*End of handoff doc. Drop into new repo as `/docs/PHASE2_HANDOFF.md` and start with the setup task list.*
