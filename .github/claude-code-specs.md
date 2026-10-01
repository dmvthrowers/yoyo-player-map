<!--
  Reference copy of the yoyo-player-map Claude Code spec, added 2026-10-01.
  The spec below is verbatim. Status as of 2026-10-01:
  1. Dependabot backlog        -> rebased; superseded/old PRs merged or closed; npm groups now open grouped PRs.
                                  #228 fixes the react-resizable-panels v4 typecheck break left by #197.
  2. eslint-config-next 16     -> merged in #217 (also needed the next 16.3.8 security bump, #216)
  3. React 18 vs 19            -> upgrade works: branch claude/react-19-spike (no source changes; map verified)
  4. Group dependabot npm      -> merged in #215
  The "no GitHub token" delivery note is outdated: PRs were opened from the session.
-->

---

# yoyo-player-map — Claude Code specs

Repo: `dmvthrowers/yoyo-player-map` (player map, map.dmvthrowers.club).
Next.js 16 + React 18 + TypeScript, pnpm monorepo, real app in `yoyomap/`. Deployed on Vercel; Supabase Postgres with RLS; Leaflet; next-intl i18n; Resend; Upstash rate limiting. Supabase migrations auto-apply via a `migrate.yml` workflow. AGENTS.md/CLAUDE.md rule files exist — read them before starting.

**Delivery mechanism (all items below):** Work on a `claude/<short-name>` branch, push the branch, and report PR-ready state (branch name + summary + test evidence) to Brandon, who reviews and merges on GitHub. You do not have a GitHub token; do not try to open issues or PRs via the API or authenticated CLI.

---

## 1. Rebase the dependabot backlog (20 open PRs, 19 red)

**Context:** 20 dependabot PRs are open and 19 are red on "Typecheck & Lint (yoyomap)" and/or "Workspace — Typecheck & Audit." Main is fully green, and three of these PRs are 100+ days old. Strong hypothesis: the branches carry stale lockfiles predating the Sep 29 audit-fix commits. The exact failing step was not readable without auth, so the diagnosis is yours to confirm.

**Task:**
1. For each of the 20 dependabot PRs, in oldest-first order:
   - Rebase onto current main (`git fetch origin main && git rebase origin/main` on a local copy of the PR branch, or `@dependabot rebase` where available).
   - Resolve lockfile-only conflicts; never touch source code to resolve a rebase.
   - Let CI run (or run `pnpm install` + `pnpm typecheck` + `pnpm lint` locally if you have the toolchain) and record the result.
2. If a PR is superseded by another open PR (same dependency, newer version), close the older one and note why.
3. For any PR that is still red after a clean rebase: read the failing check's log, write the actual failure diagnosis into the PR as a comment (or into your report to Brandon if you can't comment), and either fix it if it's a one-line config issue or leave it with the diagnosis.
4. Do not merge anything yourself — Brandon merges.

**Acceptance criteria:**
- Zero open PRs older than 30 days (merged or closed with justification).
- Every remaining open PR is green on all checks.
- Every still-red PR has a written failure diagnosis attached to it.

**Constraints/risks:**
- Never rewrite source code to satisfy a dependabot rebase. Lockfile and config changes only.
- Don't batch-close PRs without checking each one; some may be the only bump for a security fix.
- Don't merge dependabot PRs into each other — rebase or close only.

---

## 2. Bump eslint-config-next 15 → 16 (dependabot #206)

**Context:** The ESLint config major is behind the Next 16 runtime. `pnpm lint` must pass after the bump.

**Task:**
1. Check out the dependabot #206 branch (or recreate the bump on a fresh branch from main if the PR is stale).
2. Bump `eslint-config-next` 15 → 16. Read the upstream migration notes for the 15→16 config change and apply any required config adjustments (flat config rules, removed/renamed rules).
3. Run `pnpm install` and `pnpm lint` in `yoyomap/`. Fix every lint error the bump surfaces — do not add new `eslint-disable` comments to silence them; fix the underlying code or the config.
4. Run `pnpm typecheck` as a sanity check (the bump shouldn't affect types, but confirm).

**Acceptance criteria:**
- `pnpm lint` passes cleanly in `yoyomap/` with `eslint-config-next@16`.
- `pnpm typecheck` passes.
- No new `eslint-disable` comments introduced.
- No behavioral changes to the app beyond lint-required code fixes (list any code changes in the PR description).

**Constraints/risks:**
- If the lint errors are extensive (>~20 files), stop and report the count and categories to Brandon instead of churning through them — he'll decide whether to merge or wait.
- Don't touch lint rules unrelated to this bump.

---

## 3. Decide: React 18 vs 19 (react-leaflet 4 vs 5)

**Context:** react-leaflet 4.x pins React 18; react-leaflet 5 pairs with React 19. The app is on React 18. This should be a decision, not drift.

**Task:**
1. On a scratch branch (`claude/react-19-spike`), attempt the upgrade: React 18 → 19 and react-leaflet 4 → 5. Read react-leaflet 5's changelog for breaking changes first.
2. Run `pnpm install`, `pnpm typecheck`, `pnpm lint`, and the production build. Note every failure and whether it's fixable in reasonable effort.
3. Exercise the map surface manually if possible (pin rendering, popups, jittered pins, i18n) — at minimum confirm the app builds and the map component mounts.
4. Report one of two outcomes to Brandon:
   - **Upgrade works:** branch name, test evidence, list of changes needed → he merges.
   - **Upgrade not worth it:** a short "why we're on 18" note (blockers, effort estimate, re-evaluate trigger like a react-leaflet 5 stability milestone), and commit that note as `docs/react-19-decision.md` on a `claude/react-19-decision` branch.

**Acceptance criteria:**
- Either a green, tested upgrade branch, or a committed decision document explaining why the app stays on React 18 (with the concrete blockers and what would change the decision).

**Constraints/risks:**
- Scratch branch only — do not merge or open anything against main yourself.
- Do not "fix" unrelated failures you find along the way; report them.

---

## 4. Group dependabot npm updates

**Context:** Only the `github-actions` ecosystem is grouped today, so npm churn produces ~20 single PRs. That's self-inflicted noise.

**Task:**
1. Open `.github/dependabot.yml`. Add grouping for npm updates: one group for production dependencies and one for devDependencies (matching the existing github-actions group style), following dependabot's `groups:` config syntax.
2. Optional but recommended: set a weekly schedule for the npm groups if the file doesn't already constrain cadence — don't change the github-actions group.
3. Verify the YAML is valid (a YAML linter or `ruby -ryaml -e` parse is enough; dependabot config has no local dry-run).

**Acceptance criteria:**
- `.github/dependabot.yml` parses and adds npm groups (prod + dev) in the same style as the existing github-actions group.
- No changes to the github-actions group, schedule, or reviewers.
- Future dependabot runs produce grouped npm PRs instead of one-per-dependency.

**Constraints/risks:**
- Config-only change. Don't edit any workflow files or package.json in the same change.
- Keep group names clear (e.g., `npm-prod`, `npm-dev`).
