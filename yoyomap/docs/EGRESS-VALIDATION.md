# Egress Validation Runbook

Last updated: 2026-05-12

## Purpose

Use this checklist after each deployment to confirm that map and players traffic is staying on cached/static paths and that Supabase egress remains low.

## 1) Confirm build output

1. Open the Vercel build log for the deployment.

1. Verify players routes are SSG with ISR:

- /[locale]/players
- /[locale]/players/[country]
- /[locale]/players/[country]/[region]
- /[locale]/players/[country]/[region]/[city]

1. Verify Revalidate and Expire values are present for data-heavy pages (expected: 1d / 1y).

## 2) Verify runtime cache behavior

1. In Vercel runtime logs, sample repeated requests to players and map routes.
2. Confirm most traffic resolves as cache HIT or PRERENDER, not repeated cold MISS.
3. Spot-check non-localized legacy paths (/players, /map, /submit) redirect to /en/*.

## 3) Measure lean vs full query paths

Enable temporary branch logging:

- Set environment variable LOCATION_QUERY_LOGS=1 for the deployment.

Expected log labels in app logs:

- [locations:path] branch.players.country.lean
- [locations:path] branch.players.country.full
- [locations:path] branch.players.region.lean
- [locations:path] branch.players.city.lean
- [locations:path] supabase.select.lean
- [locations:path] supabase.select.full

Interpretation:

1. branch.players.*.lean should dominate list and directory traffic.
2. branch.players.country.full should appear mainly for _other-only country pages that render cards.
3. supabase.select.full should be much less frequent than supabase.select.lean.

## 4) Validate in Supabase logs

1. Filter by table: map_entries.

1. Compare query patterns:

- Lean select: id, display_name, city, region, country, entity_type, lat, lng
- Full select: includes bio and socials

1. Confirm lean query volume is higher than full query volume for crawl/list traffic windows.

## 5) Clean up

1. Disable LOCATION_QUERY_LOGS after validation to reduce log noise.
2. Record findings in deployment notes with timestamp and any anomalies.
