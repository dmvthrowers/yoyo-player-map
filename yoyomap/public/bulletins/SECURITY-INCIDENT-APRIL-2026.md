# Vercel Security Incident — April 2026

**Status:** Active investigation. Last updated: April 21, 2026.

Vercel disclosed a security incident involving unauthorized access to internal systems. The attacker compromised a third-party AI tool (Context.ai) used by a Vercel employee, then used that access to take over the employee's Google Workspace account and reach Vercel environments and **non-sensitive** environment variables.

Full bulletin: <https://vercel.com/security/april-2026>

---

## What this project's exposure looks like

Environment variables in this project fall into three risk tiers:

| Variable | Sensitive flag needed? | Risk if unmarked |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | No (public by design) | None |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No (public by design, RLS-protected) | None |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Full database read/write access |
| `RESEND_API_KEY` | **Yes** | Unauthorized email sending from the club domain |
| `EMAIL_FROM` | No | None |
| `NEXT_PUBLIC_APP_URL` | No (public by design) | None |
| `ADMIN_PASSWORD` | **Yes** | Admin dashboard access, ability to approve/delete entries |
| `ADMIN_NOTIFICATION_EMAIL` | No | None |
| `ENTRY_SECRET` | **Yes** | Forgeable verification tokens; attacker could verify entries without email confirmation |

Any variable that was **not** marked sensitive in Vercel at the time of the incident should be treated as potentially exposed.

---

## Immediate action checklist

### 1. Rotate credentials (do this first)

Work through these in order of impact. Deleting the Vercel project does **not** eliminate risk — rotate secrets before doing anything else.

- [ ] **`SUPABASE_SERVICE_ROLE_KEY`** — Regenerate in Supabase dashboard → Project Settings → API. Update in Vercel env vars.
- [ ] **`RESEND_API_KEY`** — Revoke in Resend dashboard → API Keys. Create a new key and update in Vercel.
- [ ] **`ADMIN_PASSWORD`** — Choose a new strong password and update in Vercel.
- [ ] **`ENTRY_SECRET`** — Generate a new long random string (e.g. `openssl rand -hex 32`) and update in Vercel. **Note:** rotating this invalidates all outstanding verification tokens; any in-flight email verifications will need to be re-requested.
