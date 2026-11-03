# Supabase setup (milestone 3)

## 1. Create the project

1. Sign up at https://supabase.com and create a project (choose a region near India, e.g. Mumbai).
2. Project Settings → API: copy **Project URL** and the **anon public** key.
3. Put them in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   Never put the service-role key in any `NEXT_PUBLIC_` variable.

## 2. Run the database SQL

Supabase dashboard → SQL Editor → run, in order:

1. `supabase/migrations/0001_core_schema.sql`
2. `supabase/seed.sql`
3. `supabase/migrations/0002_search_location.sql`
4. `supabase/migrations/0003_bookings.sql`
5. `supabase/migrations/0004_messaging_reviews.sql`
6. `supabase/migrations/0005_admin_dashboard.sql`

Run each file ONCE. Running a file twice gives "already exists" errors.

### Realtime (live chat)

0004 adds `messages` to the `supabase_realtime` publication. Check Dashboard > Database > Publications > supabase_realtime. If Realtime is off, chat still works: it refreshes every 20 seconds.

## 3. Auth settings

- Authentication → Providers → Email: enable, and keep **Confirm email ON**.
- Authentication → URL Configuration: Site URL `http://localhost:3000`;
  Redirect URLs: `http://localhost:3000/auth/callback`.
- For real emails at scale, configure a custom SMTP provider (the built-in sender is heavily rate limited).

## 4. Make your first admin (only way: database)

Sign up normally, then in the SQL Editor:
`update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');`

## 5. Test without Supabase (development only)

Set `AUTH_MOCK_MODE=true` in `.env.local`. Sessions are fake, nothing is stored, and it is ignored in production.

## Not done yet in this milestone

- **Phone OTP**: needs an SMS provider (Twilio/MessageBird/Vonage) configured in Supabase; India also needs DLT registration. Not implemented.
- Photo and document upload screens (buckets and policies exist; UI not built).
- RLS policies have only been syntax-checked and statically tested, not run against a live database.
