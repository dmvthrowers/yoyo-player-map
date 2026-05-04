# Contributing to YoYo Player Map 🪀

Welcome, and thank you for helping make the YoYo Player Map better for our whole community!
Whether you're a seasoned developer, a yoyo enthusiast, a parent, or someone brand-new to open
source — we're glad you're here.  Safety and trust are really important to us because many of
our community members are young people.

---

## How to Contribute

1. **Fork the repository** and create your branch from `main`.
2. **Install dependencies** with `pnpm install` (or `npm install`).
3. **Make your changes** and add tests where applicable.
4. **Run lint and build checks:**
   ```bash
   pnpm run lint
   pnpm run build
   ```
5. **Open a Pull Request** with a clear description of your changes.

---

## 🔐 Secret & Credential Safety

This section is especially important.  A secret (like an API key or a database password) is
like a house key — if someone else gets it, they can break in.  Once a secret is committed to
git history, it should be treated as **permanently compromised**, even if you delete it later,
because anyone who cloned or forked the repo may already have a copy.

### Rules for secrets in this project

| ✅ Do this | ❌ Never do this |
|---|---|
| Store secrets in a local `.env.local` file | Commit `.env.local` or any real secret to git |
| Copy `.env.example` to get started | Paste a production key directly into source code |
| Rotate (regenerate) any key you accidentally expose | Assume "deleting the commit" is enough |
| Use GitHub repository secrets for CI/CD | Log or print secrets, even for debugging |

### Step-by-step: setting up your local environment

1. Copy the example file:
   ```bash
   cp yoyomap/.env.example yoyomap/.env.local   # if an example file exists
   ```
2. Open `.env.local` and fill in your own development values.
3. **Never** add, commit, or push `.env.local`.  The `.gitignore` already excludes it —
   but double-check before every commit with `git status`.

### What to do if you accidentally commit a secret

1. **Rotate it immediately** — go to the relevant service dashboard and regenerate the key.
   For a Supabase Service Role Key: log into [supabase.com](https://supabase.com) →
   select your project → **Project Settings → API → Service Role Key → Regenerate**.
2. Tell a project maintainer so they can check for misuse.
3. Follow [GitHub's guide on removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
   if you want to scrub the secret from history (though rotation is the critical step).

---

## Code Style

- Use Prettier and ESLint (config provided).
- Write clear, concise commit messages.
- Follow accessibility and privacy best practices.

---

## 🛡️ Keeping Dependencies Safe

Outdated packages can have known security vulnerabilities.  Please:

- Run `pnpm audit` occasionally and report any high-severity findings to maintainers.
- Do not downgrade packages to versions listed in Dependabot alerts without discussing it first.
- Prefer the version ranges already pinned in `pnpm-workspace.yaml` overrides rather than
  adding duplicate lower-bound pins.

---

## Reporting Issues

- Use [GitHub Issues](../../issues) for bugs, feature requests, or questions.
- To report a **security vulnerability privately**, see [SECURITY.md](./SECURITY.md).

---

## Code of Conduct

- Be respectful and inclusive — this project is used by kids, parents, and yoyo players of all ages.
- See the [Contributor Covenant](https://www.contributor-covenant.org/) for full guidelines.

---

Thank you for helping make YoYo Player Map a safe and welcoming place for everyone! 🪀

