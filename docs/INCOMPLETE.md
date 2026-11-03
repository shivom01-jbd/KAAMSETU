# What is NOT finished (honest list)

Status: **working prototype, not production-ready.** The automated checks pass and the main flows were walked through by hand on a real Supabase project, but the items below are missing or unverified.

## Missing features

- **Phone OTP login/verification.** Needs an SMS provider configured in Supabase (India also needs DLT registration). Email verification works.
- **Photo and document upload screens.** Storage buckets and policies exist; there is no upload UI. So professionals cannot request verification themselves; an admin verifies manually.
- **Payments, wallet, earnings, withdrawals.** Shown in the design screenshots but not in the written brief. The dashboard deliberately shows no earnings, because user-entered numbers would be untrustworthy.
- **Notifications** (table and screen), **availability schedules** and **multiple service areas** (only one area and an available/busy switch exist), and the **skills picker** (table exists, no screen).
- **Google Maps adapter** and **free-text address search** (city list only).
- Admin panel is **English only**. Admin cannot browse all bookings or delete categories.
- No pagination beyond fixed limits (100 bookings, 200 messages, 100 admin rows).

## Unverified

- **Live chat (Realtime)** and the **MapLibre map** were not checked in a browser. Chat falls back to a 20 second refresh.
- Hindi text has not been reviewed by a native speaker.
- RLS is tested by `supabase/tests/security_check.sql` (run by hand, not in CI) and by static checks. There are no browser end-to-end tests.
- No load testing, no penetration test, no accessibility audit.

## Security work still open

- Distributed rate limiting (see `DEPLOYMENT.md`).
- Content-Security-Policy header.
- Account deletion and data export.
- Legal text, privacy policy and data-protection compliance need a lawyer.

## Not claimed

Production readiness is **not** claimed. Do not launch until `DEPLOYMENT.md` "Before launch" is complete.
