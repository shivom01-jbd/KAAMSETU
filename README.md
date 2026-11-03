# KAAMSETU

Mobile-first skilled-professional marketplace for India. Next.js (App Router) + TypeScript + Tailwind + Supabase (Auth, Postgres with Row Level Security, Storage, Realtime). Hindi and English.

**Status: working prototype. NOT production-ready.** Read `docs/INCOMPLETE.md` first.

## What works

Public pages and role selection, email signup/login/password reset, profiles (professional/business), search by category/city/distance/price/rating with list and map views, bookings with a server-enforced status machine, booking chat with unread counts, reviews (one per completed booking), reports and moderation, role dashboards, admin panel (verification, reports, users, categories, audit log).

## Windows setup (VS Code)

1. Install Node.js LTS (22 or newer) from https://nodejs.org and VS Code. **Keep the project outside OneDrive/Desktop** (e.g. `C:\Projects\kaamsetu`): OneDrive corrupts `node_modules`.
2. Open the folder in VS Code, then in the terminal:

```powershell
npm install
copy .env.example .env.local
npm run dev
```

3. Open http://localhost:3000.
4. Without Supabase you can try the screens with `AUTH_MOCK_MODE=true` in `.env.local` (development only; sessions are fake).
5. With Supabase: follow `docs/SETUP_SUPABASE.md` (run the SQL files once each, in order, then fill in `.env.local`).

## Commands

| Command          | What it does                            |
| ---------------- | --------------------------------------- |
| `npm run dev`    | start the app                           |
| `npm run check`  | typecheck + lint + tests + format check |
| `npm run build`  | production build                        |
| `npm run format` | auto-format                             |

## Environment variables (`.env.example`)

`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional `NEXT_PUBLIC_MAP_PROVIDER` / `NEXT_PUBLIC_MAP_STYLE_URL`, dev-only `AUTH_MOCK_MODE` and `DEV_ALLOWED_ORIGINS`. The service-role key is not used and must never be given a `NEXT_PUBLIC_` name. Never commit `.env*` files.

## Database (`supabase/`)

Run once each, in order: `migrations/0001` to `0005`, and `seed.sql` after `0001`. RLS is on for every table; clients have read-only access and all writes go through checked database functions.
Security test: paste `supabase/tests/security_check.sql` into the SQL Editor. It must report `Problems found: 0`.

## Folder map

- `src/app` pages and server actions (`auth`, `bookings`, `messages`, `reviews`, `admin`, `dashboard`)
- `src/components` UI and forms
- `src/lib` validation (zod), session, rate limit, search, text (Hindi/English), Supabase clients
- `tests` automated tests (`npm test`)
- `docs` setup, maps, deployment, test checklist, incomplete list

## Further reading

`docs/SETUP_SUPABASE.md` · `docs/MAPS.md` · `docs/DEPLOYMENT.md` · `docs/TEST_CHECKLIST.md` · `docs/INCOMPLETE.md`
