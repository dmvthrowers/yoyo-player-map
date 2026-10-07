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

All of the October 2026 "Next" items are done or in review:

| # | Item | Where |
|---|---|---|
| 6 | Error envelope on every API route; clients read it with `lib/api-error-message.ts` | #258 |
| 7 | hreflang and per-page canonicals (`lib/seo.ts` `localeAlternates`) | already done in `5587eb2` |
| 8 | Submit dedupe: form fingerprint + `Idempotency-Key`, 24h replay (`lib/submit-dedupe.ts`) | #259 |
| 9 | React Compiler lint rules on; two reasoned per-line disables in the admin page | #261 |
| 10 | Map accessibility: named map region and pins, cluster opens with Enter, list link | #260 |
| 11 | Admin page split into `admin/_components/` | #269 |
| 12 | OSV-Scanner workflow removed | #262 |
| — | Cluster badges were invisible (no cluster CSS); brand square badges | #268 |
| — | Optional OpenFreeMap vector tiles (`NEXT_PUBLIC_MAP_TILES=openfreemap`), off by default | #265 |

## Later

- **React 19 + react-leaflet 5 + react-leaflet-cluster 4** — one atomic PR. Grep for
  `LeafletProvider` first; smoke-test cluster rendering by hand (previews are off, so test
  locally). Until then, the reason to stay on React 18 is that react-leaflet 4 requires it.
- ~~`@types/node` on 25.x while the runtime is Node 22~~ — done in #263 (Dependabot now skips its majors).
- Root workspace: `packageManager` still `pnpm@10.28.0`; root `next` is a dev-only tool dep.
- ESLint 10 after the above.
- ~~`wouter`, `@vercel/analytics`, `@vercel/speed-insights` in `yoyomap`~~ — already removed;
  `wouter` in `artifacts/yoyomap` is real usage.

## Accepted

- Rate limiting fails open without Redis (availability over strictness).
- Preview deployments are off: the map is public and privacy-sensitive, and previews would need
  their own Supabase and secrets.
- Single shared admin password — fine for one or two admins; revisit if more join.
