-- KAAMSETU milestone 6: messaging, reviews, reports. Run ONCE, after 0001-0003.
-- Users get read-only table access. All writes go through security-definer functions.

-- conversations ------------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);
create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index participants_user_idx on public.conversation_participants (user_id);
create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, id);
create index messages_sender_recent_idx on public.messages (sender_id, created_at desc);

-- Membership check as security definer: avoids RLS recursion on conversation_participants.
create function public.is_conversation_member(p_conversation uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_participants
                 where conversation_id = p_conversation and user_id = auth.uid())
$$;

-- Every booking gets exactly one conversation with exactly two participants.
create function public.create_conversation_for_booking() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  insert into public.conversations (booking_id) values (new.id) returning id into cid;
  insert into public.conversation_participants (conversation_id, user_id)
  values (cid, new.customer_id), (cid, new.professional_id);
  return new;
end $$;
create trigger bookings_create_conversation after insert on public.bookings
  for each row execute function public.create_conversation_for_booking();

-- Backfill: bookings created before this migration.
with missing as (
  insert into public.conversations (booking_id)
  select b.id from public.bookings b
  where not exists (select 1 from public.conversations c where c.booking_id = b.id)
  returning id, booking_id)
insert into public.conversation_participants (conversation_id, user_id)
select m.id, u from missing m join public.bookings b on b.id = m.booking_id,
  lateral (values (b.customer_id), (b.professional_id)) as v (u);

create function public.send_message(p_conversation uuid, p_body text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare st public.booking_status; new_id bigint; clean text := trim(coalesce(p_body, ''));
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and is_suspended) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.conversation_participants
                 where conversation_id = p_conversation and user_id = auth.uid()) then
    raise exception 'not_found' using errcode = 'P0002'; -- strangers learn nothing
  end if;
  select b.status into st from public.conversations c join public.bookings b on b.id = c.booking_id
   where c.id = p_conversation;
  if st = 'cancelled' then raise exception 'chat_closed' using errcode = 'P0001'; end if;
  if char_length(clean) not between 1 and 2000 then raise exception 'invalid_message' using errcode = 'P0001'; end if;
  if (select count(*) from public.messages
       where sender_id = auth.uid() and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'too_fast' using errcode = 'P0001';
  end if;
  insert into public.messages (conversation_id, sender_id, body) values (p_conversation, auth.uid(), clean)
  returning id into new_id;
  update public.conversations set last_message_at = now() where id = p_conversation;
  update public.conversation_participants set last_read_at = now()
   where conversation_id = p_conversation and user_id = auth.uid();
  return new_id;
end $$;

create function public.mark_conversation_read(p_conversation uuid) returns void
language sql security definer set search_path = '' as $$
  update public.conversation_participants set last_read_at = now()
   where conversation_id = p_conversation and user_id = auth.uid()
$$;

-- Inbox with unread counts. SECURITY INVOKER: RLS limits it to the caller's own conversations.
create function public.my_conversations() returns table (
  conversation_id uuid, booking_id uuid, other_id uuid, other_name text, last_message_at timestamptz,
  last_body text, unread_count bigint, booking_status public.booking_status
) language sql stable security invoker set search_path = '' as $$
  select c.id, c.booking_id, o.user_id, pr.full_name, c.last_message_at,
         (select m.body from public.messages m where m.conversation_id = c.id order by m.id desc limit 1),
         (select count(*) from public.messages m
           where m.conversation_id = c.id and m.sender_id <> auth.uid() and m.created_at > me.last_read_at),
         b.status
    from public.conversation_participants me
    join public.conversations c on c.id = me.conversation_id
    join public.bookings b on b.id = c.booking_id
    join public.conversation_participants o on o.conversation_id = c.id and o.user_id <> auth.uid()
    left join public.profiles pr on pr.id = o.user_id
   where me.user_id = auth.uid()
   order by c.last_message_at desc nulls last, c.created_at desc
$$;

-- reviews ----------------------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade, -- one review per booking
  reviewer_id uuid not null references public.profiles (id),
  professional_id uuid not null references public.professional_profiles (user_id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index reviews_professional_idx on public.reviews (professional_id, created_at desc) where not is_hidden;

create function public.create_review(p_booking uuid, p_rating integer, p_comment text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare b public.bookings; new_id uuid;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and is_suspended) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into b from public.bookings where id = p_booking;
  if not found or b.customer_id <> auth.uid() then raise exception 'not_found' using errcode = 'P0002'; end if;
  if b.status <> 'completed' then raise exception 'not_completed' using errcode = 'P0001'; end if;
  if p_rating not between 1 and 5 then raise exception 'invalid' using errcode = 'P0001'; end if;
  insert into public.reviews (booking_id, reviewer_id, professional_id, rating, comment)
  values (b.id, auth.uid(), b.professional_id, p_rating,
          nullif(left(trim(coalesce(p_comment, '')), 1000), ''))
  returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'duplicate_review' using errcode = 'P0001';
end $$;

-- Rating is always recomputed from stored reviews. It is never client-supplied.
create function public.refresh_professional_rating() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pid uuid := coalesce(new.professional_id, old.professional_id);
begin
  update public.professional_profiles pp set
    rating_avg = (select round(avg(rating)::numeric, 1) from public.reviews where professional_id = pid and not is_hidden),
    rating_count = (select count(*) from public.reviews where professional_id = pid and not is_hidden)
   where pp.user_id = pid;
  return null;
end $$;
create trigger reviews_refresh_rating after insert or update of is_hidden, rating or delete on public.reviews
  for each row execute function public.refresh_professional_rating();

-- reports & moderation ---------------------------------------------------------------------------
create type public.report_status as enum ('open', 'reviewed', 'dismissed');
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('review', 'message', 'profile')),
  target_id text not null check (char_length(target_id) between 1 and 64),
  reason text not null check (char_length(reason) between 5 and 500),
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id) -- the same person cannot report the same thing twice
);
create index reports_status_idx on public.reports (status, created_at desc);

create function public.report_content(p_type text, p_target text, p_reason text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid; ok boolean := false; clean text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  if char_length(clean) not between 5 and 500 then raise exception 'invalid' using errcode = 'P0001'; end if;
  if (select count(*) from public.reports where reporter_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too_many_reports' using errcode = 'P0001';
  end if;
  if p_type = 'review' then
    ok := exists (select 1 from public.reviews r where r.id::text = p_target and not r.is_hidden);
  elsif p_type = 'message' then
    ok := exists (select 1 from public.messages m
                   where m.id::text = p_target and public.is_conversation_member(m.conversation_id));
  elsif p_type = 'profile' then
    ok := exists (select 1 from public.profiles p where p.id::text = p_target);
  end if;
  if not ok then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.reports (reporter_id, target_type, target_id, reason)
  values (auth.uid(), p_type, p_target, clean) returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'duplicate_report' using errcode = 'P0001';
end $$;

create function public.admin_set_review_hidden(p_review uuid, p_hidden boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.reviews set is_hidden = p_hidden where id = p_review;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'set_review_hidden', 'review', p_review::text,
          jsonb_build_object('hidden', p_hidden, 'note', left(p_note, 500)));
end $$;

-- grants & RLS -----------------------------------------------------------------------------------
revoke all on function public.is_conversation_member(uuid) from public, anon;
revoke all on function public.send_message(uuid, text) from public, anon;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
revoke all on function public.my_conversations() from public, anon;
revoke all on function public.create_review(uuid, integer, text) from public, anon;
revoke all on function public.report_content(text, text, text) from public, anon;
revoke all on function public.admin_set_review_hidden(uuid, boolean, text) from public, anon;
grant execute on function public.is_conversation_member(uuid) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.my_conversations() to authenticated;
grant execute on function public.create_review(uuid, integer, text) to authenticated;
grant execute on function public.report_content(text, text, text) to authenticated;
grant execute on function public.admin_set_review_hidden(uuid, boolean, text) to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
revoke all on public.conversations, public.conversation_participants, public.messages,
  public.reviews, public.reports from anon, authenticated;

grant select on public.conversations, public.conversation_participants, public.messages to authenticated;
create policy conversations_read on public.conversations for select to authenticated
  using (public.is_conversation_member(id));
create policy participants_read on public.conversation_participants for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy messages_read on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));

-- reviewer_id is NOT readable by clients (no column grant): reviews are shown without the author's identity.
grant select (id, booking_id, professional_id, rating, comment, is_hidden, created_at) on public.reviews to authenticated;
create policy reviews_read on public.reviews for select to authenticated using (
  public.is_admin()
  or exists (select 1 from public.bookings b where b.id = reviews.booking_id and b.customer_id = auth.uid())
  or (not is_hidden and professional_id = auth.uid())
  or (not is_hidden and exists (select 1 from public.professional_profiles pp
                                where pp.user_id = reviews.professional_id and pp.is_listed)));

grant select on public.reports to authenticated;
create policy reports_read on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

-- Realtime: new messages are pushed to the browser; Realtime still enforces the messages_read policy.
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when others then
  raise notice 'Could not add messages to supabase_realtime: %', sqlerrm;
end $$;
