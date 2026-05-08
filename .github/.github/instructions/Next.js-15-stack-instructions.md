# Copilot Instructions – YoYo Map (yoyomap/)



- Next.js 15 App Router only, TypeScript strict, Tailwind CSS, npm (repo uses `npm install`)
- Supabase Postgres with RLS enabled on EVERY table. Anon role has NO direct SELECT/INSERT/UPDATE/DELETE on base tables.
- Resend for transactional email, server-only via lib/email.ts
- Leaflet + OpenStreetMap via react-leaflet, client-only dynamic import
- Nominatim for city geocoding via lib/geocode.ts, server proxy only, 1 req/sec, User-Agent required
- Vercel hosting



app/
  page.tsx
  submit/page.tsx
  map/
    page.tsx // server wrapper, fetches from map_entries view
    MapClient.tsx // dynamic(() => import('./Map'), { ssr: false })
    Map.tsx // 'use client' Leaflet component
  profile/page.tsx
  admin/page.tsx
  report/page.tsx
  legal/privacy/page.tsx
  legal/terms/page.tsx
  api/
    submit/route.ts
    verify-parent/route.ts
    auth/magic-link/route.ts
    auth/verify-link/route.ts
    profile/update/route.ts
    profile/delete/route.ts
    admin/data/route.ts
    admin/action/route.ts
    report/route.ts

lib/
  supabase/client.ts // browser client (anon key)
  supabase/admin.ts // service-role client, server-only, persistSession:false
  geocode.ts // geocodeCity() + jitterCoords() ~10 miles
  email.ts // Resend wrapper
  validation.ts // Zod schemas for all inputs
  tokens.ts // secure token generation/verification using ENTRY_SECRET
  rate-limit.ts // IP rate limit using audit_log

supabase/
  schema.sql // entries, parent_consents, verification_tokens, reports, audit_log, view: map_entries



- Server Components by default. Add `'use client'` only for Map.tsx, submit form, and admin interactive UI.
- params and searchParams are async: `const { token } = await params`
- No /pages directory, no getServerSideProps. Use Route Handlers in app/api/**/route.ts
- Map loading: MapClient.tsx must wrap Map.tsx with dynamic import ssr:false



- Browser: import from lib/supabase/client.ts only
- Server: import from lib/supabase/admin.ts only. Add `import 'server-only'` at top of that file. Never import admin.ts in a client component.
- Public map reads MUST use `supabase.from('map_entries').select(...)`. Never query `entries` directly from client.
- All writes go through API routes using the service-role client.



- lib/geocode.ts is server-only. Flow: check cache → Nominatim with User-Agent header → enforce ≥1 sec between requests → apply jitterCoords() → return jittered lat/lon.
- Store ONLY jittered coordinates in entries.lat/lon. Never persist raw Nominatim result.
- Never call Nominatim from browser. Proxy via server route if needed.



- No passwords, no Supabase Auth users for public editors.
- Tokens stored in verification_tokens, hashed with ENTRY_SECRET via lib/tokens.ts.
- Under-18: insert entry with visible = false, create parent_consents row, send email, set visible = true only after /api/verify-parent succeeds. Log IP + user-agent to parent_consents and audit_log.
- Admin: /admin checks ADMIN_PASSWORD env var. Do not replace with Supabase Auth.



- All sends via lib/email.ts, server-only. Initialize: `new Resend(process.env.RESEND_API_KEY)`
- From address: <noreply@dmvthrowers.club> (verified domain). Dev fallback: <onboarding@resend.dev>
- Templates: parent consent, magic-link, report confirmation



- Validate every API payload with Zod schemas from lib/validation.ts before DB or email calls.
- Submit form includes hidden honeypot field (e.g., `website`). If filled, reject silently.
- Call checkRateLimit(ip, action) from lib/rate-limit.ts on submit, magic-link, and report routes. Write attempts to audit_log.



- Map.tsx starts with `'use client'` and imports `leaflet/dist/leaflet.css`
- Tile URL: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png with attribution © OpenStreetMap contributors
- Fix default marker icons manually (unpkg CDN URLs) because Next.js does not serve Leaflet assets
- Props: center: [lat, lon], zoom?: number, markers?: Array<{lat, lon, popup?: string}>



NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY // server only
RESEND_API_KEY // server only
ENTRY_SECRET // for token signing
ADMIN_PASSWORD // for /admin



DO: Use map_entries view for reads, jitter before insert, validate with Zod, log to audit_log, enforce honeypot and rate limits.
DO NOT: Expose service-role key to client, query entries table from browser, store raw coordinates, call Nominatim from client, add Google Maps/Mapbox, implement password auth, image uploads, direct messaging, or analytics.
