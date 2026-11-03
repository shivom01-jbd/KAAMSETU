-- KAAMSETU milestone 7: admin tools and dashboard stats. Run ONCE, after 0001-0004.
-- Every admin function re-checks public.is_admin() inside the database, so a forged request cannot pass.

create function public.admin_stats() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'users_by_role', (select coalesce(jsonb_object_agg(x.k, x.n), '{}'::jsonb)
                        from (select role::text as k, count(*) as n from public.profiles group by role) x),
    'bookings_by_status', (select coalesce(jsonb_object_agg(x.k, x.n), '{}'::jsonb)
                             from (select status::text as k, count(*) as n from public.bookings group by status) x),
    'pending_verifications', (select count(*) from public.professional_profiles where verification_status = 'pending'),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'reviews_total', (select count(*) from public.reviews),
    'reviews_hidden', (select count(*) from public.reviews where is_hidden));
end $$;

create function public.admin_list_users(p_search text default null, p_limit integer default 50)
returns table (id uuid, email text, role public.user_role, full_name text, is_suspended boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.role, p.full_name, p.is_suspended, p.created_at
      from public.profiles p join auth.users u on u.id = p.id
     where coalesce(p_search, '') = ''
        or position(lower(p_search) in lower(coalesce(u.email, ''))) > 0
        or position(lower(p_search) in lower(coalesce(p.full_name, ''))) > 0
     order by p.created_at desc
     limit least(greatest(p_limit, 1), 100);
end $$;

create function public.admin_set_suspended(p_user uuid, p_suspended boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare target public.profiles;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'invalid' using errcode = 'P0001'; end if; -- no self-lockout
  select * into target from public.profiles where id = p_user;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if target.role = 'admin' then raise exception 'forbidden' using errcode = '42501'; end if; -- admins are managed in SQL only
  update public.profiles set is_suspended = p_suspended where id = p_user;
  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_suspended then 'suspend_user' else 'unsuspend_user' end, 'profile', p_user::text,
          jsonb_build_object('note', left(p_note, 500)));
end $$;

create function public.admin_list_professionals(p_status public.verification_status default null, p_limit integer default 50)
returns table (user_id uuid, full_name text, email text, city text, verification_status public.verification_status,
               is_listed boolean, rating_avg numeric, rating_count integer, doc_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select pp.user_id, p.full_name, u.email::text, pp.city, pp.verification_status, pp.is_listed,
           pp.rating_avg, pp.rating_count,
           (select count(*) from public.verification_documents d where d.user_id = pp.user_id)
      from public.professional_profiles pp
      join public.profiles p on p.id = pp.user_id
      join auth.users u on u.id = pp.user_id
     where p_status is null or pp.verification_status = p_status
     order by (pp.verification_status = 'pending') desc, pp.created_at desc
     limit least(greatest(p_limit, 1), 100);
end $$;

create function public.admin_save_category(
  p_id uuid, p_slug text, p_name_hi text, p_name_en text, p_icon text, p_sort integer, p_active boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_id is null then
    insert into public.categories (slug, name_hi, name_en, icon, sort_order, is_active)
    values (p_slug, p_name_hi, p_name_en, nullif(p_icon, ''), coalesce(p_sort, 0), coalesce(p_active, true))
    returning id into cid;
  else
    update public.categories set slug = p_slug, name_hi = p_name_hi, name_en = p_name_en, icon = nullif(p_icon, ''),
           sort_order = coalesce(p_sort, 0), is_active = coalesce(p_active, true)
     where id = p_id returning id into cid;
    if cid is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  end if;
  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'save_category', 'category', cid::text, jsonb_build_object('slug', p_slug, 'active', p_active));
  return cid;
exception when unique_violation then
  raise exception 'duplicate_slug' using errcode = 'P0001';
end $$;

create function public.admin_list_reports(p_status public.report_status default 'open', p_limit integer default 50)
returns table (id uuid, target_type text, target_id text, reason text, status public.report_status,
               created_at timestamptz, reporter_name text, preview text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select r.id, r.target_type, r.target_id, r.reason, r.status, r.created_at, p.full_name,
           case r.target_type
             when 'review' then (select left(coalesce(rv.comment, '(no text)'), 300) from public.reviews rv where rv.id::text = r.target_id)
             when 'message' then (select left(m.body, 300) from public.messages m where m.id::text = r.target_id)
             when 'profile' then (select pr.full_name from public.profiles pr where pr.id::text = r.target_id)
           end
      from public.reports r join public.profiles p on p.id = r.reporter_id
     where p_status is null or r.status = p_status
     order by r.created_at desc
     limit least(greatest(p_limit, 1), 100);
end $$;

create function public.admin_resolve_report(p_report uuid, p_status public.report_status, p_hide boolean default false, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare rep public.reports;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status = 'open' then raise exception 'invalid' using errcode = 'P0001'; end if;
  select * into rep from public.reports where id = p_report for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  update public.reports set status = p_status, reviewed_by = auth.uid(), reviewed_at = now() where id = p_report;
  if p_hide and rep.target_type = 'review' then
    update public.reviews set is_hidden = true where id::text = rep.target_id; -- trigger refreshes the rating
  end if;
  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'resolve_report', 'report', p_report::text,
          jsonb_build_object('status', p_status, 'hid_content', p_hide and rep.target_type = 'review', 'note', left(p_note, 500)));
end $$;

-- Dashboard counts for the CURRENT user only (SECURITY INVOKER: RLS applies; every count also filters by auth.uid()).
create function public.my_dashboard_stats() returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'pro_requested', (select count(*) from public.bookings where professional_id = auth.uid() and status = 'requested'),
    'pro_active', (select count(*) from public.bookings where professional_id = auth.uid() and status in ('accepted', 'in_progress')),
    'pro_completed', (select count(*) from public.bookings where professional_id = auth.uid() and status = 'completed'),
    'pro_completed_month', (select count(*) from public.bookings where professional_id = auth.uid() and status = 'completed'
        and completed_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')),
    'cus_active', (select count(*) from public.bookings where customer_id = auth.uid() and status in ('requested', 'accepted', 'in_progress')),
    'cus_completed', (select count(*) from public.bookings where customer_id = auth.uid() and status = 'completed'))
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_stats()', 'admin_list_users(text, integer)', 'admin_set_suspended(uuid, boolean, text)',
    'admin_list_professionals(public.verification_status, integer)',
    'admin_save_category(uuid, text, text, text, text, integer, boolean)',
    'admin_list_reports(public.report_status, integer)',
    'admin_resolve_report(uuid, public.report_status, boolean, text)', 'my_dashboard_stats()']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
