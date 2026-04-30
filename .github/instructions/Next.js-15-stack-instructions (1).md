# Copilot Instructions – Next.js 15 + Supabase + Resend + Leaflet + Nominatim

## 1. Stack lock-in
- Next.js 15 App Router only, TypeScript strict, Tailwind CSS utility-first
- Supabase Postgres with Row-Level Security enabled on every table, Auth via @supabase/ssr
- Resend for transactional email, React Email templates, server-only sending
- Leaflet + OpenStreetMap tiles via react-leaflet, loaded client-only with dynamic import ssr false
- Nominatim for city geocoding, server-side proxy only, respect usage policy
- Vercel hosting, pnpm

## 3. Next.js 15 rules
- Server Components by default. Add `'use client'` only for interactive UI, browser APIs, or Leaflet.
- In Next.js 15, `params` and `searchParams` are async: always `const { id } = await params`.
- Fetch data in async Server Components. Use Server Actions (`'use server'`) for mutations, validate with Zod.
- Do not create `/pages` or use `getServerSideProps`. Use Route Handlers in `app/api/*/route.ts`.
- Dynamic import Leaflet: `const Map = dynamic(() => import('@/components/map/Map.client'), { ssr: false })`.

## 5. Supabase + Auth + RLS
- Use `@supabase/ssr` only. Create two factories:
    - Browser: `createBrowserClient` for client components
    - Server: `createServerClient` with cookies from `next/headers` for Server Components, Actions, and Route Handlers.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Enable RLS on every table. Policies must reference `auth.uid() = user_id`.
- Never expose service_role key to client.

## 6. Resend email
- Initialize once in `lib/resend.ts` on the server: `new Resend(process.env.RESEND_API_KEY)`.
- Send only from Server Actions or Route Handlers, never from client components.

## 8. Nominatim geocoding
- Server-only helper in `lib/nominatim.ts`. Never call from browser.
- Send header: `User-Agent: your-app/1.0 (contact@yourdomain.com)`.
- Enforce max 1 request per second and cache results in `geocode_cache` table.