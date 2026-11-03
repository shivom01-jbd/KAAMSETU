# Deployment guide (Vercel + Supabase)

KAAMSETU is **not production-ready until every box in "Before launch" is ticked.** See `INCOMPLETE.md`.

## 1. Plans (checked 2026-11; verify on the pricing pages before buying)

- **Vercel:** the free Hobby plan is for personal, non-commercial use only. A commercial marketplace needs **Pro** (or higher).
- **Supabase:** free projects pause after about a week of inactivity and have no automatic backups. For real users use **Pro** (daily backups, no pausing).
- Use **two separate Supabase projects**: one for testing, one for production. Never test on the production project.

## 2. Production Supabase project

1. Create a new project (region near India, e.g. Mumbai). Save the database password in a password manager.
2. SQL Editor, run each file **once**, in order: `0001`, `seed.sql`, `0002`, `0003`, `0004`, `0005` (from `supabase/`).
3. Authentication, Providers, Email: enabled, **Confirm email ON**.
4. Authentication, URL Configuration: Site URL `https://YOUR-DOMAIN`; Redirect URLs `https://YOUR-DOMAIN/auth/callback`.
5. Authentication, SMTP: configure your own email provider. The built-in sender is heavily rate limited and is not meant for production.
6. Create your admin (the only way): sign up normally, then run
   `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');`
7. Database, Backups: confirm daily backups are on (Pro). Do a test restore before launch.

## 3. Vercel

1. Push the project to a private GitHub repository (the `.env*` files are git-ignored; never commit them).
2. Vercel, Add New Project, import the repo. Framework: Next.js. Node.js version: 22.
3. Environment Variables (Production):

   | Name                                                     | Value                           |
   | -------------------------------------------------------- | ------------------------------- |
   | `NEXT_PUBLIC_APP_URL`                                    | `https://YOUR-DOMAIN`           |
   | `NEXT_PUBLIC_SUPABASE_URL`                               | production project URL          |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`                          | production anon/publishable key |
   | `NEXT_PUBLIC_MAP_PROVIDER` / `NEXT_PUBLIC_MAP_STYLE_URL` | optional, see `MAPS.md`         |

   Do **not** set `AUTH_MOCK_MODE` or `DEV_ALLOWED_ORIGINS`. Mock mode is ignored in production, but do not rely on that. `SUPABASE_SERVICE_ROLE_KEY` is not used by the app today: do not add it.

4. Deploy, then add your domain under Settings, Domains (HTTPS is automatic).

## 3b. After the first deploy

1. Run `supabase/tests/security_check.sql` on the **test** project with real test data. It must report `Problems found: 0`.
2. Walk through `TEST_CHECKLIST.md` on the live URL with throwaway accounts.
3. Check headers with https://securityheaders.com (expect HSTS, X-Frame-Options, nosniff).

## Before launch (all must be done)

- [ ] Production project on a paid plan with backups tested.
- [ ] Custom SMTP working; verification and password-reset emails arrive.
- [ ] **Rate limiting that works across servers.** The built-in limiter is in memory, so each serverless instance counts separately. Put a shared store (e.g. Upstash Redis) behind `src/lib/rate-limit.ts` or use platform firewall rules.
- [ ] Terms of Service and Privacy Policy rewritten and **reviewed by a lawyer** (the in-app text is a draft). Get advice on India's data-protection requirements for personal data.
- [ ] Real support email and phone on `/help`.
- [ ] Account deletion / anonymisation process (bookings currently block deleting a user).
- [ ] Content-Security-Policy added (needs nonce setup with Next.js).
- [ ] Phone OTP, if you want it: SMS provider and, in India, DLT registration.
- [ ] A native Hindi speaker has read every Hindi screen.
- [ ] Accessibility check with a screen reader on the main flows.

## Rollback and secrets

- Vercel keeps previous deployments: Deployments, pick an older one, Promote to Production.
- Database changes are not auto-reversible. Take a backup before running any new migration.
- If a key leaks: rotate it in Supabase (Settings, API), update Vercel, redeploy.
