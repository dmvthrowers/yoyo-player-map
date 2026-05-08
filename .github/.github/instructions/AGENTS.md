# AGENTS.md — DMV Throwers Multi-Repo Maintainer

> This file instructs any autonomous coding agent working across the DMV Throwers ecosystem. Treat as source of truth.

## 1. Mission
You maintain four public repos for a free, volunteer-run yo-yo club (est. 2021) serving DC/MD/VA. Preserve welcoming tone, accessibility, and zero-cost access.

**Immutable facts:**
- Coordinator: Brandon Rogers
- Club email: contact@dmvthrowers.club
- Contest email: vastateyoyocontest@gmail.com
- Phone: 850-284-1613
- Monthly meetup: Every 3rd Sunday, 1–4 PM, Arlington Central Library, Barbara M. Donnellan Auditorium, 1015 N Quincy St, Arlington VA 22201
- VSYC-26: September 19, 2026, Dulles Town Center Center Court, Sterling VA, 10 AM–7 PM, free to spectate, $15–25/division

## 2. Repository Map

### A. dmvthrowers.github.io — LIVE WEBSITE
- Domain: dmvthrowers.club (via CNAME)
- Stack: Static HTML5 + CSS + vanilla JS, GitHub Pages
- Pages: index, about, team, events, gallery, resources, faq, contact, 404
- VSYC pages: vsyc26.html, vsyc26-register.html, vsyc26-schedule.html, vsyc26-sponsors.html, vsyc26-venue.html, vsyc26-rules.html, vsyc26-faq.html
- Assets: /assets/css/main.css, /assets/css/vsyc26.css, /assets/js/mobile-enhancements.js, /assets/images/, /assets/documents/
- Do not modify: CNAME, robots.txt structure

### B. yoyo-player-map — YoYo Map
- Live: https://yoyo-player-map.vercel.app/en (future: map.dmvthrowers.club)
- Stack: Next.js 14, Tailwind, Leaflet, Supabase
- Key routes: /, /map, /players, /submit, /profile, /report
- Privacy: city-level only, opt-in

### C. dmvt-event-hub — Event Calendar (pre-launch)
- Target: events.dmvthrowers.club
- Stack: React 18 + Vite + Tailwind + shadcn/ui, Supabase
- Edge functions: submit-event, verify-event, manage-event, renew-event, daily-maintenance
- Env required: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID

### D. DMVT-Design — Design System
- Source of colors, typography, logos, UI kits
- Canonical red: #B80000 (fix #D42B2B bug in map codebase)
- Files: colors_and_type.css, assets/logos/, preview/

## 3. Design System Enforcement

**Voice:** Direct, welcoming. Nav ALL-CAPS. Headings Title Case. Body sentence case. Second person. Short sentences.

**Colors:**
- Main: --red #B80000, --navy #102040, --cream #fffdfa
- VSYC: --gold #C9A84C replaces red
- Donate only: --teal #13C3A3

**Typography:**
- Display: Playfair Display (never red)
- Body: DM Sans
- VSYC only: Montserrat

**Layout rules:**
- border-radius: 0 everywhere (sharp corners are brand)
- max-width: 1100px
- section padding: 80px vertical / 24px horizontal
- cards: white, 1px border, top 3px red accent OR left 4px navy accent, no shadow
- buttons: uppercase, 0.095em letter-spacing, min 44px height
- nav: 64px sticky, active link = 2px red underline

**Imagery:** No stock photos. Community candids only. Alt text required. Optimize <500KB.

## 4. Agent Roles

1. **Planner** — identify repo, list files, verify dates
2. **Coder** — minimal diffs, preserve existing patterns
3. **Asset Manager** — compress, name correctly, sync logos from DMVT-Design
4. **Reviewer** — HTML validation, link check, mobile 360px test
5. **Publisher** — conventional commits, PR, verify GitHub Pages deploy

## 5. Workflows

### Monthly Meetup Update
1. Calculate 3rd Sunday
2. Add flyer: assets/images/events/DMV Throwers [Month YYYY].png
3. Update index.html NEXT MEET banner
4. Update events.html upcoming list
5. Update sitemap.xml lastmod

### VSYC-26 Update
1. Edit only vsyc26-*.html
2. Keep date/venue/pricing immutable
3. Add sponsors to vsyc26-sponsors.html with logo from DMVT-Design
4. Update PDF in assets/documents/ with version suffix

### YoYo Map Link
1. Use https://yoyo-player-map.vercel.app/en until DNS cutover
2. Ensure red #B80000 in Tailwind config
3. Add CTA on resources.html

### Event Hub Prep
1. Do not deploy to production yet
2. Verify migrations in supabase/migrations/
3. Test edge functions locally
4. Prepare README with events.dmvthrowers.club instructions

## 6. Guardrails

- NEVER change free admission language
- NEVER add tracking pixels or external fonts
- NEVER introduce border-radius, shadows, or animations beyond 0.2s ease
- NEVER delete historical flyers or gallery photos
- ALWAYS keep CNAME = dmvthrowers.club
- ALWAYS use relative links in main site

## 7. Commit Convention
- feat(events): add September 2026 flyer
- fix(vsyc26): correct sponsor tier
- chore(assets): sync logos from DMVT-Design
- docs: update AGENTS.md

## 8. Validation Checklist
- [ ] All 15 main-site pages share identical nav
- [ ] Images have alt text
- [ ] No horizontal scroll at 360px
- [ ] Links resolve (no 404)
- [ ] Colors match #B80000 red
- [ ] border-radius: 0 confirmed
- [ ] sitemap.xml updated
- [ ] CNAME intact
