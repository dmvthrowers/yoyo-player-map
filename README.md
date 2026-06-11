# YoYo Player Map

**A privacy-first community map for yo-yoers, by [DMV Throwers](https://dmvthrowers.club) Yo-Yo & Skill Toy Club.**

Players, clubs, and shops submit a display name and city to appear as pins on a public map. Person pins show only an approximate area (jittered ~10 miles); precise locations are shown only for shops and clubs that opt in. No accounts, no messaging, no GPS, no data sales.

🌐 **Live site:** [dmvthrowers.club](https://dmvthrowers.club) · 📸 [@dmv_throwers](https://instagram.com/dmv_throwers) · ☕ [ko-fi.com/dmvthrowers](https://ko-fi.com/dmvthrowers)

## Repository layout

| Path | What it is |
| --- | --- |
| `yoyomap/` | The app: Next.js 15 (App Router) + Supabase + Leaflet, deployed on Vercel. **See [`yoyomap/README.md`](yoyomap/README.md) for details.** |
| `yoyomap/supabase/` | Database schema, migrations, and RLS policies |
| `scripts/` | Standalone TypeScript utilities (e.g. location-data fixes) |
| `skills/`, `.agents/` | Agent skill definitions used for AI-assisted maintenance |
| `.github/workflows/` | CI (lint, typecheck, audit), OSV scanner, dependency review |

`yoyomap/` is a standalone pnpm project, intentionally outside the root workspace (CI installs it with `--ignore-workspace`).

## Development

Requires Node 22 and pnpm (see `packageManager` in `package.json`; `corepack enable` handles it).

```sh
cd yoyomap
pnpm install
cp .env.local.example .env.local   # fill in Supabase/Upstash/email values
pnpm dev
```

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## Contact

| | |
| --- | --- |
| **Club Email** | <contact@dmvthrowers.club> |
| **Instagram** | [@dmv_throwers](https://instagram.com/dmv_throwers) |
| **Coordinator** | Brandon Rogers |

*DMV Throwers · Est. 2021 · DC · MD · VA*
