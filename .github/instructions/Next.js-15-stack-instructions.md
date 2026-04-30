# Copilot Instructions – Next.js 15 + Supabase + Resend + Leaflet + Nominatim

## 1. Stack lock-in
- Next.js 15 App Router only, TypeScript strict, Tailwind CSS utility-first
- Supabase Postgres with Row-Level Security enabled on every table, Auth via @supabase/ssr
- Resend for transactional email, React Email templates, server-only sending
- Leaflet + OpenStreetMap tiles via react-leaflet, loaded client-only with dynamic import ssr false
- Nominatim for city geocoding, server-side proxy only, respect usage policy
- Vercel hosting, pnpm

## 2. Project structure
app/
  (auth)/login/page.tsx
  (app)/dashboard/page.tsx
  api/geocode/route.ts
  api/email/route.ts
  layout.tsx
components/
  map/Map.client.tsx
  ui/
lib/
  supabase/client.ts
  supabase/server.ts
  resend.ts
  nominatim.ts
emails/
  Welcome.tsx
supabase/migrations/

## 3. Next.js 15 rules
- Server Components by default. Add `'use client'` only for interactive UI, browser APIs, or Leaflet.
- In Next.js 15, `params` and `searchParams` are async: always `const { id } = await params`.
- Fetch data in async Server Components. Use Server Actions (`'use server'`) for mutations, validate with Zod.
- Do not create `/pages` or use `getServerSideProps`. Use Route Handlers in `app/api/*/route.ts`.
- Dynamic import Leaflet: `const Map = dynamic(() => import('@/components/map/Map.client'), { ssr: false })`【719330656032125400†L5-L6】.

## 4. TypeScript and Tailwind
- `strict: true`, no `any`. Prefer `unknown` with narrowing.
- Export shared DB types generated from Supabase.
- Tailwind utilities only. Use `cn()` helper for conditional classes. No CSS modules for layout.

## 5. Supabase + Auth + RLS
- Use `@supabase/ssr` only. Create two factories:
    - Browser: `createBrowserClient` for client components
    - Server: `createServerClient` with cookies from `next/headers` for Server Components, Actions, and Route Handlers【4047917327714353297†L35-L38】【4047917327714353297†L48-L50】.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key). `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Enable RLS on every table. Policies must reference `auth.uid() = user_id` for select, insert, update, delete.
- Never expose service_role key to client. Never bypass RLS in app code.

## 6. Resend email
- Initialize once in `lib/resend.ts` on the server: `new Resend(process.env.RESEND_API_KEY)`.
- Send only from Server Actions or Route Handlers, never from client components【5103196911068996285†L5-L6】.
- Templates live in `/emails` using `@react-email/components`. Return `{ success, id?, error? }` objects.

## 7. Leaflet + OpenStreetMap
- Component must start with `'use client'`. Import `leaflet/dist/leaflet.css` inside the component.
- TileLayer: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` with attribution `© OpenStreetMap contributors`.
- Fix default marker icons manually; Next.js does not serve Leaflet's default image paths.
- Accept explicit props: `center: [lat, lng]`, `zoom: number`, `markers?: Array<{lat, lng, popup?}>`.

## 8. Nominatim geocoding
- Server-only helper in `lib/nominatim.ts`. Never call from browser.
- Send header: `User-Agent: your-app/1.0 (contact@yourdomain.com)`【4338322454092323654†L33-L37】.
- Enforce max 1 request per second【4338322454092323654†L5-L7】. Implement simple rate limiter and cache results in Supabase table `geocode_cache(query text primary key, lat double precision, lon double precision, result jsonb, cached_at timestamptz)`.
- Do not use for autocomplete. Debounce client input and proxy through `/api/geocode`.

## 9. Vercel deployment
- Required env vars:
  | Name | Scope |
  | --- | --- |
  | NEXT_PUBLIC_SUPABASE_URL | Public |
  | NEXT_PUBLIC_SUPABASE_ANON_KEY | Public |
  | SUPABASE_SERVICE_ROLE_KEY | Server only |
  | RESEND_API_KEY | Server only |
- Use Node runtime for routes that use Resend or service role. Keep middleware lightweight for Supabase session refresh.

## 10. Do and Do Not
**DO:**
- Validate all Server Action inputs with Zod before DB or email calls.
- Return typed results from actions, handle errors server-side.
- Add loading.tsx and error.tsx for route segments.

**DO NOT:**
- Suggest Google Maps SDK or Mapbox tokens.
- Import Supabase service role in client components.
- Call Nominatim from client code or without rate limiting.
- Disable RLS or use policies with `true`.