-- KAAMSETU security check. Paste into Supabase SQL Editor and Run.
-- It impersonates a stranger, the customer, the professional and an admin, tries things they must NOT be able to do,
-- then rolls everything back on purpose. The result appears as an error named SECURITY REPORT: that is the report.
-- Needs at least one booking (with a chat) in the database. Safe to run any time; it changes nothing.
do $$
declare
  b uuid; c uuid; p uuid; conv uuid; a uuid;
  stranger uuid := gen_random_uuid();
  r text := '';
  n int;
  problems int;
begin
  select id, customer_id, professional_id into b, c, p from public.bookings order by created_at desc limit 1;
  if b is null then raise exception 'No booking found. Create one first (customer request + chat).'; end if;
  select id into conv from public.conversations where booking_id = b;
  select id into a from public.profiles where role = 'admin' limit 1;
  r := r || E'\n\n-- A. A STRANGER (not part of the booking)';
  perform set_config('request.jwt.claims', json_build_object('sub', stranger, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', stranger::text, true);
  set local role authenticated;
  select count(*) into n from public.bookings;
  r := r || E'\n1. Stranger sees bookings: ' || n || ' (want 0)' || case when n = 0 then ' good' else ' <-- BAD' end;
  select count(*) into n from public.booking_events;
  r := r || E'\n2. Stranger sees booking history: ' || n || ' (want 0)' || case when n = 0 then ' good' else ' <-- BAD' end;
  select count(*) into n from public.conversations;
  r := r || E'\n3. Stranger sees conversations: ' || n || ' (want 0)' || case when n = 0 then ' good' else ' <-- BAD' end;
  select count(*) into n from public.conversation_participants;
  r := r || E'\n4. Stranger sees chat participants: ' || n || ' (want 0)' || case when n = 0 then ' good' else ' <-- BAD' end;
  select count(*) into n from public.messages;
  r := r || E'\n5. Stranger sees messages: ' || n || ' (want 0)' || case when n = 0 then ' good' else ' <-- BAD' end;
  select count(*) into n from public.reports;
  r := r || E'\n6. Stranger sees reports: ' || n || ' (want 0)' || case when n = 0 then ' good' else ' <-- BAD' end;
  select count(*) into n from public.verification_documents;
  r := r || E'\n7. Stranger sees verification documents: ' || n || ' (want 0)' || case when n = 0 then ' good' else ' <-- BAD' end;
  select count(*) into n from public.admin_audit_logs;
  r := r || E'\n8. Stranger sees audit log: ' || n || ' (want 0)' || case when n = 0 then ' good' else ' <-- BAD' end;
  begin
    perform public.transition_booking(b, 'cancelled');
    r := r || E'\n9. Stranger cancels the booking: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n9. Stranger cancels the booking: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    perform public.send_message(conv, 'intruder');
    r := r || E'\n10. Stranger sends a chat message: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n10. Stranger sends a chat message: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    perform public.create_review(b, 5, 'fake');
    r := r || E'\n11. Stranger reviews someone else''s job: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n11. Stranger reviews someone else''s job: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    insert into public.bookings (customer_id, professional_id, description, preferred_at) values (stranger, p, 'direct insert attempt', now() + interval '1 day');
    r := r || E'\n12. Stranger inserts a booking directly: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n12. Stranger inserts a booking directly: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, stranger, 'direct');
    r := r || E'\n13. Stranger inserts a message directly: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n13. Stranger inserts a message directly: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    perform public.admin_stats();
    r := r || E'\n14. Stranger reads admin statistics: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n14. Stranger reads admin statistics: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    perform * from public.admin_list_users();
    r := r || E'\n15. Stranger lists all users: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n15. Stranger lists all users: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    perform public.admin_set_suspended(p, true);
    r := r || E'\n16. Stranger suspends a user: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n16. Stranger suspends a user: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    perform public.admin_set_verification(p, 'verified');
    r := r || E'\n17. Stranger verifies a professional: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n17. Stranger verifies a professional: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    perform public.admin_save_category(null, 'hack', 'x', 'y', null, 0, true);
    r := r || E'\n18. Stranger creates a category: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n18. Stranger creates a category: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    perform public.admin_set_review_hidden(gen_random_uuid(), true);
    r := r || E'\n19. Stranger hides a review: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n19. Stranger hides a review: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  r := r || E'\n\n-- B. The CUSTOMER of the booking';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', c::text, true);
  set local role authenticated;
  select count(*) into n from public.bookings;
  r := r || E'\n20. Customer sees own bookings: ' || n || ' (want >= 1)' || case when n >= 1 then ' good' else ' <-- BAD' end;
  select count(*) into n from public.messages where conversation_id = conv;
  r := r || E'\n21. Customer sees messages in own chat: ' || n || case when n >= 1 then ' good' else ' <-- CHECK (no messages to read; send one first)' end;
  begin
    update public.messages set body = 'edited';
    r := r || E'\n22. Customer edits a message: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n22. Customer edits a message: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    delete from public.messages;
    r := r || E'\n23. Customer deletes a message: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n23. Customer deletes a message: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    insert into public.reviews (booking_id, reviewer_id, professional_id, rating) values (b, c, p, 5);
    r := r || E'\n24. Customer inserts a review directly: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n24. Customer inserts a review directly: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    update public.reviews set rating = 1;
    r := r || E'\n25. Customer edits a review rating: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n25. Customer edits a review rating: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    perform reviewer_id from public.reviews limit 1;
    r := r || E'\n26. Customer reads reviewer_id column: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n26. Customer reads reviewer_id column: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    update public.professional_profiles set rating_avg = 5 where user_id = p;
    r := r || E'\n27. Customer sets a professional''s rating: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n27. Customer sets a professional''s rating: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    update public.professional_profiles set verification_status = 'verified' where user_id = p;
    r := r || E'\n28. Customer verifies a professional: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n28. Customer verifies a professional: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    update public.profiles set role = 'admin' where id = c;
    r := r || E'\n29. Customer makes self admin: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n29. Customer makes self admin: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    perform public.transition_booking(b, 'accepted');
    r := r || E'\n30. Customer accepts own booking: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n30. Customer accepts own booking: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    perform public.admin_stats();
    r := r || E'\n31. Customer reads admin statistics: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n31. Customer reads admin statistics: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  select count(*) into n from public.admin_audit_logs;
  r := r || E'\n32. Customer sees audit log rows: ' || n || ' (want 0)' || case when n = 0 then ' good' else ' <-- BAD' end;
  begin
    perform public.my_dashboard_stats();
    r := r || E'\n33. Customer dashboard stats: works good';
  exception when others then
    r := r || E'\n33. Customer dashboard stats: FAILED (' || sqlstate || ' ' || left(sqlerrm, 60) || ') <-- CHECK';
  end;
  begin
    perform public.create_review(b, 5, 'second review');
    r := r || E'\n34. Customer reviews the same job again: ALLOWED (only ok if this booking had no review yet and is completed) <-- CHECK';
  exception when others then
    r := r || E'\n34. Customer second review: ' || left(sqlerrm, 40) || case when sqlerrm in ('duplicate_review', 'not_completed') then ' good' else ' <-- CHECK' end;
  end;
  r := r || E'\n\n-- C. The PROFESSIONAL of the booking';
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p::text, true);
  set local role authenticated;
  begin
    perform public.create_review(b, 5, 'self review');
    r := r || E'\n35. Professional reviews own job: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n35. Professional reviews own job: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    update public.professional_profiles set verification_status = 'verified' where user_id = p;
    r := r || E'\n36. Professional sets own verification: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n36. Professional sets own verification: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    update public.professional_profiles set rating_count = 999 where user_id = p;
    r := r || E'\n37. Professional sets own rating: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n37. Professional sets own rating: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, p, 'direct');
    r := r || E'\n38. Professional inserts a message directly: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n38. Professional inserts a message directly: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    perform * from public.admin_list_users();
    r := r || E'\n39. Professional lists all users: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n39. Professional lists all users: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    perform public.my_dashboard_stats();
    r := r || E'\n40. Professional dashboard stats: works good';
  exception when others then
    r := r || E'\n40. Professional dashboard stats: FAILED (' || sqlstate || ' ' || left(sqlerrm, 60) || ') <-- CHECK';
  end;
  if a is not null then
  r := r || E'\n\n-- D. An ADMIN';
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', a::text, true);
    set local role authenticated;
  begin
    perform public.admin_stats();
    r := r || E'\n41. Admin reads statistics: works good';
  exception when others then
    r := r || E'\n41. Admin reads statistics: FAILED (' || sqlstate || ' ' || left(sqlerrm, 60) || ') <-- CHECK';
  end;
  begin
    perform * from public.admin_list_users();
    r := r || E'\n42. Admin lists users: works good';
  exception when others then
    r := r || E'\n42. Admin lists users: FAILED (' || sqlstate || ' ' || left(sqlerrm, 60) || ') <-- CHECK';
  end;
  begin
    perform public.admin_set_suspended(a, true);
    r := r || E'\n43. Admin suspends self: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n43. Admin suspends self: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    update public.profiles set role = 'customer' where id = a;
    r := r || E'\n44. Admin edits own role directly (must use SQL): ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n44. Admin edits own role directly (must use SQL): blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  begin
    perform reviewer_id from public.reviews limit 1;
    r := r || E'\n45. Admin reads reviewer_id column: ALLOWED <-- BAD';
  exception when others then
    r := r || E'\n45. Admin reads reviewer_id column: blocked (' || sqlstate || ' ' || left(sqlerrm, 60) || ')'
      || case when sqlstate in ('42501', 'P0001', 'P0002', '28000') then ' good' else ' <-- CHECK unexpected error' end;
  end;
  else
    r := r || E'\n\n-- D. ADMIN checks skipped: no admin user exists yet.';
  end if;

  reset role;
  problems := (length(r) - length(replace(r, '<-- ', ''))) / 4;
  -- Rolls back everything on purpose. The message below IS the report.
  raise exception E'SECURITY REPORT (nothing was changed). Problems found: %\n%', problems, r;
end $$;
