-- KAAMSETU milestone 5: bookings. Users have NO direct insert/update on these tables.
-- All writes go through security-definer functions that verify the caller and the status transition.
create type public.booking_status as enum ('requested', 'accepted', 'in_progress', 'completed', 'cancelled');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  professional_id uuid not null references public.professional_profiles (user_id) on delete restrict,
  category_id uuid references public.categories (id),
  description text not null check (char_length(description) between 10 and 1000),
  preferred_at timestamptz not null,
  area_label text check (char_length(area_label) <= 80),
  approx_lat double precision check (approx_lat between 6 and 38),
  approx_lng double precision check (approx_lng between 68 and 98),
  status public.booking_status not null default 'requested',
  cancelled_by uuid references public.profiles (id),
  cancel_reason text check (char_length(cancel_reason) <= 300),
  accepted_at timestamptz, started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_not_self check (customer_id <> professional_id),
  constraint booking_loc_pair check ((approx_lat is null) = (approx_lng is null))
);
create index bookings_customer_idx on public.bookings (customer_id, created_at desc);
create index bookings_pro_idx on public.bookings (professional_id, status, created_at desc);
-- One open request per customer/professional pair (stops spam).
create unique index bookings_one_open_idx on public.bookings (customer_id, professional_id)
  where status in ('requested', 'accepted', 'in_progress');
create trigger bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();

create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  actor_id uuid not null references public.profiles (id),
  from_status public.booking_status,
  to_status public.booking_status not null,
  created_at timestamptz not null default now()
);
create index booking_events_booking_idx on public.booking_events (booking_id, created_at);

-- The single source of truth for allowed status changes (mirrored in src/lib/bookings/transitions.ts).
create function public.booking_transition_allowed(p_from public.booking_status, p_to public.booking_status, p_actor text)
returns boolean language sql immutable set search_path = '' as $$
  select exists (
    select 1 from (values
      ('requested'::public.booking_status, 'accepted'::public.booking_status, 'professional'),
      ('requested', 'cancelled', 'professional'),
      ('requested', 'cancelled', 'customer'),
      ('requested', 'cancelled', 'admin'),
      ('accepted', 'in_progress', 'professional'),
      ('accepted', 'cancelled', 'professional'),
      ('accepted', 'cancelled', 'customer'),
      ('accepted', 'cancelled', 'admin'),
      ('in_progress', 'completed', 'professional'),
      ('in_progress', 'cancelled', 'professional'),
      ('in_progress', 'cancelled', 'admin')
    ) as t (f, t2, a) where t.f = p_from and t.t2 = p_to and t.a = p_actor)
$$;

create function public.create_booking(
  p_professional uuid, p_description text, p_preferred_at timestamptz,
  p_area_label text default null, p_lat double precision default null, p_lng double precision default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare me public.profiles; pro public.professional_profiles; new_id uuid;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  select * into me from public.profiles where id = auth.uid();
  if not found or me.is_suspended or me.role not in ('customer', 'business') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into pro from public.professional_profiles where user_id = p_professional and is_listed;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p_preferred_at <= now() or p_preferred_at > now() + interval '1 year' then
    raise exception 'invalid_time' using errcode = 'P0001';
  end if;
  if (select count(*) from public.bookings where customer_id = auth.uid() and status = 'requested') >= 10 then
    raise exception 'too_many_requests' using errcode = 'P0001';
  end if;
  insert into public.bookings (customer_id, professional_id, category_id, description, preferred_at, area_label, approx_lat, approx_lng)
  values (auth.uid(), p_professional, pro.category_id, trim(p_description), p_preferred_at,
          nullif(left(trim(coalesce(p_area_label, '')), 80), ''),
          round(p_lat::numeric, 2)::double precision, round(p_lng::numeric, 2)::double precision)
  returning id into new_id;
  insert into public.booking_events (booking_id, actor_id, from_status, to_status)
  values (new_id, auth.uid(), null, 'requested');
  return new_id;
end $$;

create function public.transition_booking(p_booking uuid, p_to public.booking_status, p_reason text default null)
returns public.booking_status language plpgsql security definer set search_path = '' as $$
declare b public.bookings; actor text;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and is_suspended) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into b from public.bookings where id = p_booking for update; -- row lock: no race between two clicks
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  actor := case when auth.uid() = b.professional_id then 'professional'
                when auth.uid() = b.customer_id then 'customer'
                when public.is_admin() then 'admin' end;
  if actor is null then raise exception 'not_found' using errcode = 'P0002'; end if; -- do not reveal existence
  if not public.booking_transition_allowed(b.status, p_to, actor) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  update public.bookings set
    status = p_to,
    accepted_at = case when p_to = 'accepted' then now() else accepted_at end,
    started_at = case when p_to = 'in_progress' then now() else started_at end,
    completed_at = case when p_to = 'completed' then now() else completed_at end,
    cancelled_by = case when p_to = 'cancelled' then auth.uid() else cancelled_by end,
    cancel_reason = case when p_to = 'cancelled' then nullif(left(trim(coalesce(p_reason, '')), 300), '') else cancel_reason end
  where id = b.id;
  insert into public.booking_events (booking_id, actor_id, from_status, to_status)
  values (b.id, auth.uid(), b.status, p_to);
  return p_to;
end $$;

revoke all on function public.booking_transition_allowed(public.booking_status, public.booking_status, text) from public, anon;
revoke all on function public.create_booking(uuid, text, timestamptz, text, double precision, double precision) from public, anon;
revoke all on function public.transition_booking(uuid, public.booking_status, text) from public, anon;
grant execute on function public.booking_transition_allowed(public.booking_status, public.booking_status, text) to authenticated;
grant execute on function public.create_booking(uuid, text, timestamptz, text, double precision, double precision) to authenticated;
grant execute on function public.transition_booking(uuid, public.booking_status, text) to authenticated;

alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
revoke all on public.bookings, public.booking_events from anon, authenticated;
grant select on public.bookings, public.booking_events to authenticated; -- read only; no insert/update/delete

create policy bookings_read on public.bookings for select to authenticated
  using (customer_id = auth.uid() or professional_id = auth.uid() or public.is_admin());
create policy booking_events_read on public.booking_events for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_events.booking_id));

-- Each side of a booking may read the other's basic profile (name/avatar only; column grants limit the rest).
create policy profiles_booking_counterparty on public.profiles for select to authenticated using (
  exists (select 1 from public.bookings b
          where (b.customer_id = profiles.id and b.professional_id = auth.uid())
             or (b.professional_id = profiles.id and b.customer_id = auth.uid())));
