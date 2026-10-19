# Yoyo Archive Integration — Cross-Site Product and Engineering Specification

Status: Proposed / implementation planning. Owner: DMV Throwers. Updated: 2026-10-18.

## Goal
Integrate appropriately licensed Yoyo Archive structured data into DMV Throwers properties without duplicating its editorial mission. First release: opt-in My Throw Collection in yoyo-player-map; subsequently equipment explorer on static club site and historical competition references in event hub.

## Non-negotiables
- All ages, all levels, always free. No paywalls, analytics tracking, or precise player location disclosure.
- Maintain each project's existing authentication, authorization, design conventions, and navigation; no CNAME edits.
- Design tokens: #B80000 red, #102040 navy, #fffdfa cream, #C9A84C gold; Playfair/DM Sans/Montserrat; zero border radius, zero shadows.
- Relative internal links; image assets under 500 KB and descriptive alt text. Do not reuse third-party images without explicit rights.
- Preserve original source URL, author/license attribution and upstream IDs. Confirm dataset license and each asset's rights before release; derived shared datasets comply with applicable share-alike terms. Keep member data in a separate store/license boundary.
- Minimize minors' information. Profiles and collections private by default; public sharing explicit, revocable and per item. Never infer player locations from equipment ownership.

## Upstream discovery gate
Before implementing parser: inspect https://github.com/rkalajian/yoyo-archive-data for current LICENSE, README, manifest, schema, file names, IDs, relationships, changelog and publication workflow. Record pinned revision and source URL. Previous exploratory file names (product/company/profile/competition/review/taxonomies/article/catalog/manifest/changelog) are hypotheses until verified. No unverified schema assumptions in production.

## Architecture
Scheduled GitHub Action in yoyo-player-map (initial owner) fetches upstream manifest and changed files, verifies content/hash where supported, validates a versioned schema adapter, normalizes a minimal product index, and publishes a versioned generated JSON artifact. Never fetch upstream per visitor. Use conditional requests, retry/backoff, timeout, maximum payload size, immutable source revision, and last-known-good fallback. Fail closed on invalid records. Separate generated Archive-derived dataset from user-generated collections. A future shared package may be extracted only when a second consumer needs it.

Canonical imported record:
{ source: "yoyoarchive", sourceId: string, sourceUrl: string, name: string, manufacturerId?: string, manufacturerName?: string, specs?: { diameterMm?: number, widthMm?: number, weightG?: number, material?: string, playStyle?: string[] }, upstreamModifiedAt?: string, importedRevision: string }
Optional values stay absent; no invented data. Stable key = source + sourceId; aliases and tombstones for upstream renames/deletions. Sanitize text and URLs, restrict external protocols to HTTPS, and never render upstream HTML unsanitized.

Collection data (private app store, not part of Archive-derived export):
{ id, ownerUserId, archiveProductKey, status: owned|previously_owned|wishlist, visibility: private|public, notes?, createdAt, updatedAt }
Enforce unique (ownerUserId, archiveProductKey, status) or define a deliberate multi-copy model later. Server-side owner checks on every read/write; public endpoint returns only opted-in fields. Rate-limit search and mutations. No bulk member export. Define account deletion and stale-source behavior.

## Scope by repository
### yoyo-player-map (P0/P1)
- Adapter + fixture tests + sync workflow + generated searchable index.
- Authenticated collection CRUD; private default; search/autocomplete; accessible keyboard/mobile UX.
- Optional public profile panel and per-entry privacy controls; no location correlation or public collection directory initially.
- Attribution, upstream source link, missing/deleted record fallback, empty/error/loading states.
### dmvthrowers.github.io (P2)
- Static beginner guide, resource page, manufacturer/equipment explorer using published generated data.
- Match existing NAV exactly, keep all internal links relative, NEVER edit CNAME.
### dmvt-event-hub (P3)
- Read-only verified historical competition references, provenance, manual review queue for event imports and dedupe. Do not automatically overwrite local event details.
### DMVT-Design (P1)
- Square-corner equipment card, comparison table, collection controls, attribution and empty states; reusable specs with responsive/a11y examples.

## Functional acceptance criteria
1. Search finds products by model and maker, handles punctuation and case, and never claims absent specs.
2. Signed-in member adds/removes owned, previously owned and wishlist entries; another account cannot access private entries.
3. Visibility defaults to private, and changing public to private removes the entry from public views immediately.
4. Upstream import preserves attribution, provenance and source revision; malformed feed cannot replace last-good data.
5. Upstream deletion/rename does not orphan a collection; display archival fallback and mark source unavailable.
6. No upstream image displayed without verified separate rights.
7. No user data is written into the shared CC BY-SA-derived dataset.
8. Tests cover duplicate IDs, schema drift, invalid URLs, empty index, missing fields, stale revision, import rollback, authorization and public serialization.
9. Lighthouse/a11y checks include mobile, keyboard, contrast and reduced motion. No tracking, paywall, border radius or shadows.
10. Each repo validates its build and diff independently; PRs are reviewed before merge.

## Delivery plan and dependencies
- Phase 0: audit four repos, upstream schema/license, auth/data architecture, existing CI; record baseline. Deliver schema mapping and risk log.
- Phase 1: implement version-pinned adapter, fixtures, validation, sync action, last-known-good artifact, provenance/attribution. Exit: fixture and malformed-feed tests pass; documented manual sync and rollback.
- Phase 2: implement My Throw Collection in player map behind a feature flag. Exit: authorization, privacy and mobile acceptance tests pass.
- Phase 3: add static resource/explorer pages on main site and shared design patterns. Exit: navigation parity and site build pass.
- Phase 4: add event hub references with human review and duplicate detection. Exit: no auto-published external event changes.
- Phase 5: optional opt-in player-to-player equipment discovery and comparison/history timeline after privacy review.

## PR sequence
1. docs: cross-site spec and upstream mapping (this PR).
2. feat: archive adapter, fixtures and sync.
3. feat: private collection storage and API.
4. feat: collection UX and opt-in public profile.
5. feat: main-site resources/explorer.
6. feat: event-hub reviewed historical references.
7. docs: contributor and operational runbook.

## Operations
Scheduled daily sync plus manual dispatch; retain previous known-good snapshots and pinned revisions. Log revision, counts, schema validation failures and timing without member identifiers. Alert maintainers on repeated sync failures. Document attribution and correction/removal procedure. No auto-merge or auto-deploy until validation and human review.

## Open decisions
- Confirm upstream data model and precise redistribution obligations.
- Confirm current player-map auth, database and profile permissions before storage migration.
- Choose static generated artifact hosting and stable cross-repo consumption.
- Decide whether public collection sharing is disabled for accounts identified as minors.
- Agree on equipment search scale, locale and stale-data retention period.
