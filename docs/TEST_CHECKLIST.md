# Manual test checklist

Use two browser windows: normal (customer) and private/incognito (professional). Use test accounts only.

1. **Signup/login:** register a customer and a professional; confirm both emails; log in; log out; reset a password.
2. **Professional profile:** on `/account` choose a category, a city, prices, tick "show my profile", Save ("Saved.").
3. **Search:** customer searches the city; the professional appears; filters (category, distance, price) change results.
4. **Booking:** customer requests a service; professional accepts, starts, completes (confirmation dialog each time); customer sees History: Completed with no buttons.
5. **Chat:** customer messages; professional sees an unread count; reply arrives (instantly or within 20 s).
6. **Review:** customer rates the completed job; rating shows on the professional page; a second review is refused.
7. **Report:** professional reports a message; admin sees it under Reports; Mark reviewed; Audit log shows `resolve_report`.
8. **Admin:** Verify a professional (badge appears); suspend/unsuspend a test user; add a category.
9. **Wrong person:** in the private window open `/admin`: must show 404.
10. **Database:** run `supabase/tests/security_check.sql`: `Problems found: 0`.
