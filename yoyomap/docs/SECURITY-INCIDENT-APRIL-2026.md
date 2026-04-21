# Vercel Security Incident — April 2026

**Status:** Active investigation. Last updated: April 21, 2026.

Vercel disclosed a security incident involving unauthorized access to internal systems. The attacker compromised a third-party AI tool (Context.ai) used by a Vercel employee, then used that access to take over the employee's Google Workspace account and reach Vercel environments and **non-sensitive** environment variables.

Full bulletin: https://vercel.com/security/april-2026

---

## What this project's exposure looks like

Environment variables in this project fall into three risk tiers:

| Variable | Sensitive flag needed? | Risk if unmarked |
|---|---|---|
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

### 2. Mark all secrets as sensitive in Vercel

In Vercel dashboard → Project → Settings → Environment Variables, ensure the following are marked **Sensitive**:

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `ADMIN_PASSWORD`
- `ENTRY_SECRET`

Sensitive variables are encrypted at rest and cannot be read back through the UI or API, which is the protection that prevented exposure during this incident.

### 3. Enable multi-factor authentication on Vercel

Account Settings → Security → enable 2FA with an authenticator app or passkey. This is the single most effective account protection step.

### 4. Review the Vercel activity log

Dashboard → Project → Activity. Look for:

- Unexpected deployments (times you didn't deploy, unusual commit hashes)
- Environment variable reads or changes you didn't make
- New team member additions or permission changes

Delete any suspicious deployments.

### 5. Check Google Workspace for the IOC OAuth app

If your Vercel account is tied to a Google Workspace account, ask your Google Workspace admin to check for and revoke access from:

```
110671459871-30f1spbu0hptbs60cb4vsmv79i7bbvqj.apps.googleusercontent.com
```

This is the Context.ai OAuth app identified as the entry point for the attack.

### 6. Review Supabase for unexpected activity

In the Supabase dashboard → Logs, check for unexpected queries or access patterns, especially any queries not originating from your Vercel function IP ranges.

---

## If you suspect active compromise

1. Immediately rotate all credentials listed above.
2. In Supabase, temporarily enable Row-Level Security policies that deny all access (as a circuit breaker), restore service once credentials are rotated.
3. Review `map_entries` for any unexpected records (spam submissions, data exfiltration via bulk queries).
4. Contact Vercel support: https://vercel.com/help

---

## References

- [Vercel April 2026 Security Bulletin](https://vercel.com/security/april-2026)
- [Vercel sensitive environment variables docs](https://vercel.com/docs/projects/environment-variables/sensitive-environment-variables)
- [Vercel 2FA documentation](https://vercel.com/docs/accounts/2fa)
