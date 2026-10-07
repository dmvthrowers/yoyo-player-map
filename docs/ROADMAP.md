# YoYo Player Map — Roadmap

Open work, in priority order. Built from the October 2026 technical audit; every status was
re-checked against the code on 2026-10-02. Update it as items land.

## Done since the audit

| Item | Where |
|---|---|
| `next` 16.3.5 → 16.3.8 (next/og RCE advisory) | `bb51e69` |
| `eslint-config-next` 15 → 16, flat config | `211ba18` |
| Dependabot backlog cleared; npm updates grouped (`npm-prod`, `npm-dev`) | #215, #229–#234 |
| Turnstile on submit and report, Sentry, `/api/health` | #241 |
| Job check-ins, failure alerts, nightly encrypted DB backups, QStash drain backstop | `6e61580`, `b54b990` |
| Submit form shows an error when location lists fail to load (was silently empty); inline error instead of `alert()` when adding a city fails | this PR |
| Map page shows an error banner when pins fail to load, and no longer caches a failed load as an empty map for 24h; screen-reader `<h1>` added | this PR |
| Every page has a default `<title>`, description and Open Graph tags (the homepage had none); `metadataBase` set | this PR |
| `SECURITY.md` (root and `.github/`) replaced: was GitHub's default template | this PR |
| Existing `node:test` file runs in CI (`pnpm test`); `i18n:parity --strict` gates CI | this PR |
| Dead config removed: `ENTRY_SECRET` (no code reads it), `.eslintrc.json` (ignored by ESLint 9), the `eslint` key in `next.config.js` (removed in Next 16) | this PR |

## Now (owner actions — dashboards, not code)

1. **Confirm the Supabase `service_role` key was rotated.** The audit found a real
   service-role key committed in `yoyomap/.env.local` in public git history (May 4–13, 2026).
   It bypasses RLS. If it hasn't been regenerated since May 13, rotate it now (Supabase → Project
   Settings → API), update Vercel, and check Supabase logs since May 4.
2. **Delete `ENTRY_SECRET` from Vercel** — nothing reads it.
3. **Confirm `ADMIN_PASSWORD` is 32+ random characters**, and rotate it whenever anyone with
   access leaves.
4. **Enable secret scanning and push protection** (Settings → Code security) — free on public
   repos and would have blocked the key leak above.
5. **Vercel storage:** the team was at or near the 10 GB free-tier deployment-storage cap on
   Oct 1. Delete stale deployments and set retention (pre-production and errored: 7 days,
   production: 30 days) under Team Settings → Security & Privacy.

## Next (code)

6. **Error envelope everywhere.** 8 of 19 API routes use `withErrorHandling`
   (`{error:{code,message,requestId}}`). The `admin/*` routes, `auth/verify-link`,
   `verify-parent`, `revalidate-map`, `health` and `cron/route.js` return bare
   `{ error: 'string' }` with no request id, so their failures can't be matched to logs.
7. **hreflang and canonicals.** No page declares `alternates.languages` for the 11 locales, so
   search engines may treat `/en/map`, `/es/map`… as duplicates. Add them (plus a per-page
   canonical) in each page's `generateMetadata`.
8. ~~**Idempotency and dedupe on `POST /api/submit`.**~~ Done: `lib/submit-dedupe.ts` claims a
   hash of the validated form plus the `Idempotency-Key` header in Redis and replays the first
   response for 24h. Fails open without Redis, like rate limiting.
9. **React Compiler lint rules.** `eslint.config.mjs` turns off `react-hooks/purity` and
   `react-hooks/set-state-in-effect` repo-wide. Fix the flagged code, or disable per file with a
   reason.
10. **Map accessibility.** The Leaflet container has no `aria-label`, and `divIcon` markers
    can't be focused with a keyboard. The `/players` directory is the accessible alternative —
    link to it from the map for keyboard and screen-reader users.
11. **Split `src/app/[locale]/admin/page.tsx`** (~820 lines) into components.
12. **OSV-Scanner:** the club site's identical workflow fails at startup. Check this repo's
    Actions tab; if runs are red or noisy, delete `.github/workflows/osv-scanner.yml` —
    Dependabot, `dependency-review` and `pnpm audit` in CI already cover it.

## Later

- **React 19 + react-leaflet 5 + react-leaflet-cluster 4** — one atomic PR. Grep for
  `LeafletProvider` first; smoke-test cluster rendering by hand (previews are off, so test
  locally). Until then, the reason to stay on React 18 is that react-leaflet 4 requires it.
- `@types/node` is on 25.x while the runtime is Node 22 — move to `@types/node@22`.
- Root workspace: `packageManager` still `pnpm@10.28.0`; root `next` is a dev-only tool dep.
- ESLint 10 after the above.
- `wouter` is a dependency nothing in the App Router should need — confirm and remove.
- `@vercel/analytics` and `@vercel/speed-insights` are installed but never mounted — remove them,
  or mount them and update the privacy policy (the README promises no analytics).

## Accepted

- Rate limiting fails open without Redis (availability over strictness).
- Preview deployments are off: the map is public and privacy-sensitive, and previews would need
  their own Supabase and secrets.
- Single shared admin password — fine for one or two admins; revisit if more join.
