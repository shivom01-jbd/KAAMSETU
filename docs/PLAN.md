# KAAMSETU implementation plan

## Roles

Customer ("I am a Customer" / People seeking work in the welcome flow), Professional, Business/Employer, Admin.
Role is stored server-side in `profiles.role`; admin is granted only via DB (never via client or signup).

## Screen inventory (from references, 20-screen flow)

Splash, Welcome, Choose mode, Sign up + OTP, Home, Map, Pro list, Pro profile, Chat, Service request,
Pro registration (4 steps), Skills, Pro dashboard, Job requests, Reviews, Notifications, Earnings,
Settings, Wallet, Profile/More. Wallet/payments are NOT in the brief: deferred until requested.
Note: reference 3 says "SkillConnect" and "+1" US flag: ignore; use KAAMSETU and +91.

## Schema (milestone 3 migrations)

profiles, categories, skills, professional_skills, service_areas, availability, bookings,
conversations, conversation_participants, messages, reviews (unique booking_id), verification_documents,
reports, notifications, admin_audit_logs. RLS on all; storage buckets private by default.
Public coordinates are rounded/obfuscated; exact location kept private.

## Security model

Server validates all input (zod, milestone 3), RLS is the last line of defense, service-role key server-only,
booking transitions enforced in SQL function + server action, rate limiting on OTP/chat/report endpoints,
CSP + security headers (basic headers done in M1).

## Milestones

- [x] 1 Foundation + design system
- [ ] 2 Public pages, role selection
- [~] 3 Auth (email) + profiles + migrations/RLS (phone OTP, uploads, live RLS tests pending)
- [x] 4 Search + map adapter (passed live on Supabase)
- [x] 5 Bookings (passed live on Supabase, incl. SQL security test)
- [x] 6 Messaging + reviews (walked through by hand on live Supabase)
- [x] 7 Dashboards + admin (walked through by hand; admin UI English only; earnings not shown)
- [x] 8 Security tests + deployment docs (production launch checklist still open: docs/DEPLOYMENT.md)
