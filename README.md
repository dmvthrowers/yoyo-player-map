# YoYo Player Map

**A privacy-first community map for yo-yoers, by [DMV Throwers](https://dmvthrowers.club) Yo-Yo & Skill Toy Club.**

Players, clubs, and shops submit a display name and city to appear as pins on a public map. Person pins show only an approximate area (jittered ~10 miles); precise locations are shown only for shops and clubs that opt in. No accounts, no messaging, no GPS, no data sales.

**Live map:** [map.dmvthrowers.club](https://map.dmvthrowers.club) · **Club site:** [dmvthrowers.club](https://dmvthrowers.club) · [@dmv_throwers](https://instagram.com/dmv_throwers) · ☕ [ko-fi.com/dmvthrowers](https://ko-fi.com/dmvthrowers)

**New here?** Start with [`docs/REPO_GUIDE.md`](docs/REPO_GUIDE.md) (how the app works), [`AGENTS.md`](AGENTS.md) (standing rules) and [`docs/ROADMAP.md`](docs/ROADMAP.md) (open work).

## Repository layout

| Path | What it is |
| --- | --- |
| `yoyomap/` | The app: Next.js 16 (App Router) + Supabase + Leaflet, deployed on Vercel at map.dmvthrowers.club. **See [`yoyomap/README.md`](yoyomap/README.md) for details.** |
| `yoyomap/supabase/` | Database schema, migrations, and RLS policies |
| `scripts/` | Standalone TypeScript utilities (e.g. location-data fixes) |
| `skills/`, `.agents/` | Agent skill definitions used for AI-assisted maintenance |
| `docs/` | [`REPO_GUIDE.md`](docs/REPO_GUIDE.md), [`ROADMAP.md`](docs/ROADMAP.md), [`EMAIL_QUEUE_PLAN.md`](docs/EMAIL_QUEUE_PLAN.md) |
| `.github/workflows/` | CI (typecheck, lint, unit tests, i18n parity, audit, build), Supabase migrations, nightly DB backup, OSV scanner, dependency review |

`yoyomap/` is a standalone pnpm project, intentionally outside the root workspace (CI installs it with `--ignore-workspace`).

## Development

Requires Node 22 and pnpm (see `packageManager` in `package.json`; `corepack enable` handles it).

```sh
cd yoyomap
pnpm install --ignore-workspace
cp .env.local.example .env.local   # fill in Supabase/Upstash/email values
pnpm dev
```

Checks (all run in CI): `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm i18n:parity --strict`, `pnpm build`.

## Docs

- [`docs/REPO_GUIDE.md`](docs/REPO_GUIDE.md) — architecture, routes and data flow
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — open work and owner actions
- [`yoyomap/docs/LAUNCH-CHECKLIST.md`](yoyomap/docs/LAUNCH-CHECKLIST.md) — Vercel/Supabase setup
- Cross-repo overview: [dmvthrowers.github.io/docs/README.md](https://github.com/dmvthrowers/dmvthrowers.github.io/blob/main/docs/README.md)
- Full October 2026 audit (Google Drive, access-restricted): [Technical docs - Oct 2026](https://drive.google.com/drive/folders/1Jt7amThKNkeVJenksPtA87cBtR-nwZiq)

## Contact

| | |
| --- | --- |
| **Club Email** | <contact@dmvthrowers.club> |
| **Instagram** | [@dmv_throwers](https://instagram.com/dmv_throwers) |
| **Coordinator** | Brandon Rogers |

*DMV Throwers · Est. 2021 · DC · MD · VA*
