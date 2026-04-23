
# DMV Throwers · YoYo Map

**A privacy-first community map for yo-yoers, by DMV Throwers Yo-Yo & Skill Toy Club.**

🌐 **Website:** [dmvthrowers.club](https://dmvthrowers.club)
📸 **Instagram:** [@dmv_throwers](https://instagram.com/dmv_throwers)
🔗 **Linktree:** [linktr.ee/dmvthrowers](https://linktr.ee/dmvthrowers)
☕ **Support us:** [ko-fi.com/dmvthrowers](https://ko-fi.com/dmvthrowers)

Last updated: 2026-04-23

---

## About the Project

YoYo Map helps yo-yoers find each other by letting users submit a display name, city, and (optionally) socials and a short bio. Pins appear on a public map showing only an approximate area (blurred ~10 miles). No messaging, no GPS, no data sales. Built for privacy, safety, and community.

---

## Contact

| | |
| --- | --- |
| **Club Email** | <contact@dmvthrowers.club> |
| **Contest Email** | <vastateyoyocontest@gmail.com> |
| **Phone** | <850-284-1613> |
| **Instagram** | [@dmv_throwers](https://instagram.com/dmv_throwers) |
| **Coordinator** | Brandon Rogers |

---

## Site Structure

| Page | URL |
| --- | --- |
| Home | [map.dmvthrowers.club](https://map.dmvthrowers.club) |
| Submit | [map.dmvthrowers.club/submit](https://map.dmvthrowers.club/submit) |
| Map | [map.dmvthrowers.club/map](https://map.dmvthrowers.club/map) |
| Profile | [map.dmvthrowers.club/profile](https://map.dmvthrowers.club/profile) |
| Admin | [map.dmvthrowers.club/admin](https://map.dmvthrowers.club/admin) |
| Legal: Privacy | [map.dmvthrowers.club/legal/privacy](https://map.dmvthrowers.club/legal/privacy) |
| Legal: Terms | [map.dmvthrowers.club/legal/terms](https://map.dmvthrowers.club/legal/terms) |
| Contact | [dmvthrowers.club/contact.html](https://dmvthrowers.club/contact.html) |
| Main Club Site | [dmvthrowers.club](https://dmvthrowers.club) |

---

## File Structure

```text
/ (root)
├── yoyomap/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── submit/page.tsx
│   │   ├── map/
│   │   │   ├── page.tsx
│   │   │   ├── MapClient.tsx
│   │   │   └── Map.tsx
│   │   ├── profile/page.tsx
│   │   ├── admin/page.tsx
│   │   ├── report/page.tsx
│   │   ├── legal/
│   │   │   ├── privacy/page.tsx
│   │   │   └── terms/page.tsx
│   │   └── api/
│   │       └── ...
│   ├── lib/
│   │   ├── supabase/client.ts
│   │   ├── supabase/admin.ts
│   │   ├── geocode.ts
│   │   ├── email.ts
│   │   ├── validation.ts
│   │   ├── tokens.ts
│   │   └── rate-limit.ts
│   ├── supabase/
│   │   ├── schema.sql
│   │   └── migrations/
│   ├── docs/
│   ├── public/
│   ├── README.md
│   ├── LICENSE
│   ├── CONTRIBUTING.md
│   ├── CODE_OF_CONDUCT.md
│   ├── SECURITY.md
│   ├── sitemap.xml
│   └── robots.txt
└── ...
```

---

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** — Postgres, Row-Level Security, auth-ready
- **Resend** — Transactional email
- **Leaflet + OpenStreetMap** — Map rendering (no Google Maps key needed)
- **Nominatim** — City geocoding (free, no key)
- **Vercel** — Hosting

Total monthly cost at launch-day scale: **$0** (all free tiers).

---

## ⚠️ Before you launch

**Have a lawyer review the privacy policy and terms of service.** The drafts in `app/legal/` are a reasonable starting point specific to this architecture, but they are not a substitute for legal review. A Virginia nonprofit clinic, an early-career lawyer, or a service like LegalZoom can likely do this for a couple hundred dollars or less.

Specifically, a lawyer should confirm:

- The COPPA parental consent flow qualifies as "verifiable" for your risk tolerance (email-only is the lighter end of acceptable — stronger options exist)
- GDPR/CCPA rights language is accurate for your operations
- Limitation of liability and governing law clauses are appropriate for DMV Throwers as an EIN-registered sole-prop DBA

---

## Local setup

### 1. Install Node.js 20+ and npm

```bash
node --version  # should be 20+
```

### 2. Install dependencies

```bash
cd yoyomap
npm install
```

### 3. Set up Supabase

1. Create a free account at <https://supabase.com>
2. Create a new project (choose a region close to you — US East works fine)
3. Once provisioned, go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ keep this secret)
4. Go to **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and run it.
5. Verify: the `Table Editor` should now show `entries`, `parent_consents`, `verification_tokens`, `reports`, `audit_log` tables, and a `map_entries` view.

### 4. Set up Resend (email)

1. Create account at <https://resend.com>
2. Add and verify `dmvthrowers.club` as a sending domain (they'll give you DNS records to add)
3. Create an API key → `RESEND_API_KEY`
4. Your "from" address: `noreply@dmvthrowers.club` (or similar on the verified domain)

If you want to skip this for local testing, Resend's sandbox works from `onboarding@resend.dev` to your own verified email only.

### 5. Create `.env.local`

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

Generate a random `ENTRY_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Set `ADMIN_PASSWORD` to something strong — this is how you log into `/admin`.

### 6. Run it

```bash
npm run dev
```

Visit <http://localhost:3000>

---

## Deploy to Vercel

1. Push this repo to GitHub (private repo recommended — the service role key should never leak)
2. Go to <https://vercel.com> and import the GitHub repo
3. In **Environment Variables**, add every key from `.env.local`
4. Deploy
5. Point your domain: in Vercel project settings, add `map.dmvthrowers.club` and update your DNS CNAME to point there

---

## Architecture notes

### Privacy-first design choices

**Coordinate jitter.** When a user submits, we geocode their city, then randomly offset the result by up to ~10 miles before storing. This happens in both `lib/geocode.ts#jitterCoords` and a Postgres function. The jittered value is stored permanently — we never have access to the true location.

**Public view isolation.** Reads from the map come through the `map_entries` view, which explicitly excludes email, age, parent consent records, and anything else that shouldn't leave the server.

**Row-Level Security.** Direct table access is revoked for the `anon` role. All writes go through server-side API routes using the service role key, which runs only in Vercel's serverless functions — never in the browser bundle.

**Parental consent.** Under-18 submissions are not visible until the parent clicks a unique link sent to the email provided. We log IP and user-agent at consent time as an audit trail. Consent can be revoked by email.

**No direct messaging.** The site deliberately does not implement messaging. Any user contact happens through whatever social handles each user chose to share.

**Honeypot + rate limiting.** A hidden form field catches naive bots. IP-based rate limiting (via the audit log) throttles submission and magic-link requests.

### File structure

```
app/
  page.tsx                    Landing
  submit/page.tsx             Submit form (client)
  map/
    page.tsx                  Server wrapper
    MapClient.tsx             Dynamic import wrapper
    Map.tsx                   Leaflet component
  profile/page.tsx            Edit/delete entry
  admin/page.tsx              Admin dashboard
  report/page.tsx             Abuse report
  legal/
    privacy/page.tsx
    terms/page.tsx
  api/
    submit/                   POST new entry
    verify-parent/            GET verify entry or consent
    auth/
      magic-link/             POST send edit link
      verify-link/            GET exchange token → entry
    profile/
      update/                 POST edit entry
      delete/                 POST hard delete
    admin/
      data/                   GET admin dashboard data
      action/                 POST admin mod actions
    report/                   POST abuse report
lib/
  supabase/client.ts          Browser client
  supabase/admin.ts           Service-role server client
  geocode.ts                  Nominatim + jitter
  email.ts                    Resend templates
  validation.ts               Zod schemas
  tokens.ts                   Secure token generation
  rate-limit.ts               IP rate limit + audit
supabase/
  schema.sql                  Full DB schema
```

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vercel v0 (UI Primitives)](https://v0.dev/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Resend Email API](https://resend.com/docs)

---

## Maintenance

### Admin dashboard

Visit `/admin`, enter the `ADMIN_PASSWORD`, and you get:

- Stats (total, visible, pending, flagged, minors, open reports)
- Open reports with action buttons (hide, delete, resolve)
- Full entry list with flag/unflag/delete controls

### Data retention

The schema supports cleanup, but doesn't auto-run it. Consider setting up a weekly Supabase scheduled function (or a Vercel cron) to:

- Delete `audit_log` rows older than 90 days
- Delete expired `verification_tokens`
- Optional: delete `parent_consents` 3 years after the linked entry was deleted

### Monitoring

Supabase gives you the DB logs. Vercel gives you serverless function logs. If you want to get fancy later, plug in Sentry for error tracking.

### COPPA audit trail

Every consent grant logs IP, user-agent, timestamp, and consent token. If you ever need to prove a consent happened (FTC inquiry, parent dispute), the records are in `parent_consents` and `audit_log`.

---

## What's intentionally NOT built

- **User accounts.** Auth is magic-link only. No passwords.
- **Image uploads.** Fewer attack surfaces.
- **Direct messaging.** Safety over feature count.
- **Analytics.** Privacy over optimization.
- **Payment.** Always free.
- **Mobile apps.** The web is responsive. Mobile is for later.

---

## License

This project is free and unencumbered software released into the public domain under [The Unlicense](https://unlicense.org/). See LICENSE for details.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## Questions?

Email [contact@dmvthrowers.club](mailto:contact@dmvthrowers.club) or open an issue.
