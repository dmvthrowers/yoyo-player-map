# Security Policy

## Scope

This repo runs the YoYo Player Map at <https://map.dmvthrowers.club>. Only the current `main`
branch is deployed and supported; there are no versioned releases.

In scope: the app in `yoyomap/` (pages, API routes, Supabase RLS policies and migrations) and
the workflows in `.github/workflows/`. Out of scope: Vercel, Supabase, Resend, Upstash and
Cloudflare themselves — report those to the vendor.

## Reporting a vulnerability

Email **contact@dmvthrowers.club** with "Security" in the subject, or use GitHub's
"Report a vulnerability" button on this repo's Security tab if it's enabled. Please include the
URL or file, steps to reproduce, and what an attacker could do. Don't open a public issue.

The map holds personal data, including records for 13–17-year-olds and their parents, so we
treat anything that could expose emails, exact locations or consent records as urgent. This is
a volunteer-run club: expect an acknowledgment within a few days and a fix or a plan within two
weeks for serious issues. We'll credit you if you'd like.

Please don't access data that isn't yours, run load or denial-of-service tests, or test against
other people's entries.

## For maintainers

- Never commit `.env.local` or real keys. If a secret ever reaches git history, rotate it — a
  deleted file is still in the public history.
- Rotation steps for every secret are in `yoyomap/docs/SECURITY-INCIDENT-APRIL-2026.md`.
- Open security work is tracked in `docs/ROADMAP.md`.
