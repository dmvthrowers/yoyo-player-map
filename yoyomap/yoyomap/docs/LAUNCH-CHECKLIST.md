# Launch Checklist

A step-by-step from "got the code" to "live site." Expect ~2 hours of hands-on time, plus whatever the lawyer takes.

## Phase 1 — Infrastructure (30 min)

- [ ] **Supabase:** create account, create project in US East region
- [ ] Run `supabase/schema.sql` in the SQL Editor; verify all tables + the `map_entries` view exist
- [ ] Copy URL, anon key, and service role key somewhere safe
- [ ] **Resend:** create account, add `dmvthrowers.club` domain, add DNS records Resend gives you
- [ ] Wait for DNS to propagate (5–15 min usually); verify domain shows "verified" in Resend
- [ ] Create Resend API key, copy somewhere safe
- [ ] **Vercel:** create account, connect your GitHub

## Phase 2 — Legal (highly variable, do in parallel)

- [ ] Find a lawyer. Options in order of cost:
  - Law school clinic (free but slow)
  - Local small-business attorney via Virginia State Bar referral (~$200–500)
  - LegalZoom or similar (~$100–300, less personalized)
- [ ] Have them review `app/legal/privacy/page.tsx` and `app/legal/terms/page.tsx`
- [ ] Update the effective date and remove the "DRAFT" banner at the top once reviewed
- [ ] Confirm COPPA consent approach is acceptable for your risk tolerance; if not, upgrade to a stricter verification method (credit card micro-charge, knowledge-based ID verification, etc.)

## Phase 3 — Local test (30 min)

- [ ] Clone repo, `npm install`
- [ ] Copy `.env.local.example` → `.env.local`, fill in Supabase + Resend keys + a strong `ADMIN_PASSWORD`
- [ ] `npm run dev`
- [ ] Submit a test entry with your own email — confirm verification email arrives
- [ ] Click verify link — confirm you land on `/map` and your pin appears
- [ ] Submit a test minor entry with yourself as the parent email — confirm both emails arrive
- [ ] Click the parent consent link — confirm entry becomes visible
- [ ] Go to `/profile`, request magic link, confirm you can edit
- [ ] Delete the entry, confirm it disappears from the map
- [ ] Submit another entry, then go to `/report?id=<that-entry-id>` and file a `harassment` report — confirm the entry auto-hides
- [ ] Log into `/admin` with your admin password — confirm stats and controls work

## Phase 4 — Deploy (20 min)

- [ ] Push code to a **private** GitHub repo (service role key must never leak)
- [ ] Import repo into Vercel
- [ ] Add all env vars from `.env.local` in Vercel project settings
- [ ] Deploy
- [ ] Add `map.dmvthrowers.club` as a custom domain in Vercel; update Cloudflare or wherever DNS lives
- [ ] Wait for SSL cert to issue (~2 min)

## Phase 5 — Pre-launch smoke test (15 min)

- [ ] Hit the live URL, submit a real entry, verify email
- [ ] Test on mobile — both submit flow and map
- [ ] Check the privacy and terms pages render correctly
- [ ] Log into `/admin` from live site
- [ ] Verify the Resend "from" address isn't landing in spam — test with Gmail, Outlook, and Yahoo if you have all three

## Phase 6 — Launch announcement

- [ ] Write a DMV Throwers / YoYo Boomer Club / personal CaptnRogers post announcing it
- [ ] Include: what it is, the privacy promises, how to add yourself, the consent disclaimer for minors
- [ ] Seed with 5–10 people you know first so the map isn't empty on day one

## Ongoing

- [ ] Check `/admin` weekly for open reports and flagged entries
- [ ] Set a quarterly reminder to rotate the admin password and any API keys
- [ ] Set a calendar reminder 90 days out to check audit log size and clean up if needed
- [ ] If the site grows past ~1000 entries, revisit the Nominatim usage policy (1 req/sec) — at scale you may want a paid geocoder

## Known gaps to address post-launch

- **Automated data retention.** The schema supports cleanup but nothing runs it. Add a Supabase scheduled function or Vercel cron when you have bandwidth.
- **Email deliverability.** Consider adding DMARC/DKIM/SPF records beyond what Resend requires.
- **Backup strategy.** Supabase does daily backups on free tier for 7 days. Upgrade if that's not enough.
- **Accessibility audit.** The site is keyboard-navigable and uses semantic HTML but hasn't been screen-reader tested.
- **Internationalization.** If the site takes off outside the US, consider localizing the consent flow.
