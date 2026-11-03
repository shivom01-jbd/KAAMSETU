-- KAAMSETU milestone 3: identity, profiles, categories, verification, audit. RLS on every table.
create type public.user_role as enum ('customer', 'professional', 'business', 'admin');
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type public.document_status as enum ('pending', 'approved', 'rejected');

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- profiles -------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text check (char_length(full_name) between 1 and 100),
  avatar_path text check (char_length(avatar_path) <= 300),
  preferred_locale text not null default 'hi' check (preferred_locale in ('hi', 'en')),
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and not is_suspended)
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Role comes from a WHITELIST. A client sending role=admin in signup metadata becomes a customer.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare r text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when r in ('customer', 'professional', 'business') then r::public.user_role else 'customer' end,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100), '')
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- categories & skills --------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name_hi text not null, name_en text not null, icon text,
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  name_hi text not null, name_en text not null,
  unique (category_id, name_en)
);
create index skills_category_idx on public.skills (category_id);

-- professional & business profiles -------------------------------------------------------
create table public.professional_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  category_id uuid references public.categories (id),
  experience_years smallint check (experience_years between 0 and 60),
  bio text check (char_length(bio) <= 1000),
  price_min_inr integer check (price_min_inr >= 0),
  price_max_inr integer check (price_max_inr >= 0),
  city text check (char_length(city) <= 80),
  area_label text check (char_length(area_label) <= 80),
  service_radius_km smallint not null default 5 check (service_radius_km between 1 and 100),
  is_available boolean not null default true,
  is_listed boolean not null default false,
  verification_status public.verification_status not null default 'unverified',
  verified_at timestamptz,
  verified_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_range check (price_max_inr is null or price_min_inr is null or price_max_inr >= price_min_inr)
);
create index pro_category_idx on public.professional_profiles (category_id);
create index pro_listing_idx on public.professional_profiles (is_listed, is_available);
create index pro_city_idx on public.professional_profiles (lower(city));
create trigger pro_updated before update on public.professional_profiles
  for each row execute function public.set_updated_at();

create table public.professional_skills (
  user_id uuid not null references public.professional_profiles (user_id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  primary key (user_id, skill_id)
);
create index professional_skills_skill_idx on public.professional_skills (skill_id);

create table public.business_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 120),
  city text check (char_length(city) <= 80),
  description text check (char_length(description) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger biz_updated before update on public.business_profiles
  for each row execute function public.set_updated_at();

-- verification documents & audit ---------------------------------------------------------
create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  doc_type text not null check (doc_type in ('id_proof', 'address_proof', 'skill_certificate', 'other')),
  storage_path text not null check (storage_path like user_id::text || '/%'),
  status public.document_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_note text check (char_length(review_note) <= 500),
  created_at timestamptz not null default now()
);
create index verification_docs_user_idx on public.verification_documents (user_id);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles (id),
  action text not null, target_type text not null, target_id text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_actor_idx on public.admin_audit_logs (actor_id, created_at desc);

-- security-definer actions (the only way to change verification) -------------------------
create function public.admin_set_verification(p_user uuid, p_status public.verification_status, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.professional_profiles
     set verification_status = p_status,
         verified_at = case when p_status = 'verified' then now() else null end,
         verified_by = auth.uid()
   where user_id = p_user;
  if not found then raise exception 'not_found'; end if;
  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'set_verification', 'professional_profile', p_user::text,
          jsonb_build_object('status', p_status, 'note', left(p_note, 500)));
end $$;

create function public.request_verification() returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.verification_documents where user_id = auth.uid()) then
    raise exception 'documents_required' using errcode = 'P0001';
  end if;
  update public.professional_profiles set verification_status = 'pending'
   where user_id = auth.uid() and verification_status in ('unverified', 'rejected');
end $$;
revoke all on function public.admin_set_verification(uuid, public.verification_status, text) from public, anon;
revoke all on function public.request_verification() from public, anon;
grant execute on function public.admin_set_verification(uuid, public.verification_status, text) to authenticated;
grant execute on function public.request_verification() to authenticated;

-- RLS ------------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.skills enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.professional_skills enable row level security;
alter table public.business_profiles enable row level security;
alter table public.verification_documents enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Start from zero privileges, then grant narrowly (column-level where it matters).
revoke all on public.profiles, public.categories, public.skills, public.professional_profiles,
  public.professional_skills, public.business_profiles, public.verification_documents,
  public.admin_audit_logs from anon, authenticated;

-- profiles: no phone/email here. Others see only listed professionals' basic info.
grant select (id, role, full_name, avatar_path, preferred_locale, created_at) on public.profiles to authenticated;
grant update (full_name, avatar_path, preferred_locale) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_admin()
  or exists (select 1 from public.professional_profiles pp where pp.user_id = profiles.id and pp.is_listed)
);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- categories / skills: public read, admin write
grant select on public.categories, public.skills to anon, authenticated;
grant insert, update, delete on public.categories, public.skills to authenticated;
create policy categories_read on public.categories for select using (is_active or public.is_admin());
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy skills_read on public.skills for select using (true);
create policy skills_admin on public.skills for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- professional_profiles: verification_* columns are NOT writable by users (no column grant)
grant select on public.professional_profiles to authenticated;
grant insert (user_id, category_id, experience_years, bio, price_min_inr, price_max_inr, city, area_label,
              service_radius_km, is_available, is_listed) on public.professional_profiles to authenticated;
grant update (user_id, category_id, experience_years, bio, price_min_inr, price_max_inr, city, area_label,
              service_radius_km, is_available, is_listed) on public.professional_profiles to authenticated;
create policy pro_read on public.professional_profiles for select to authenticated
  using (is_listed or user_id = auth.uid() or public.is_admin());
create policy pro_insert_own on public.professional_profiles for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'professional' and not p.is_suspended));
create policy pro_update_own on public.professional_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, delete on public.professional_skills to authenticated;
create policy pskills_read on public.professional_skills for select to authenticated using (
  user_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.professional_profiles pp where pp.user_id = professional_skills.user_id and pp.is_listed));
create policy pskills_write on public.professional_skills for insert to authenticated with check (user_id = auth.uid());
create policy pskills_delete on public.professional_skills for delete to authenticated using (user_id = auth.uid());

-- business_profiles: own only (+ admin read)
grant select on public.business_profiles to authenticated;
grant insert (user_id, company_name, city, description) on public.business_profiles to authenticated;
grant update (user_id, company_name, city, description) on public.business_profiles to authenticated;
create policy biz_read on public.business_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy biz_insert_own on public.business_profiles for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'business' and not p.is_suspended));
create policy biz_update_own on public.business_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- verification documents: private to owner and admins
grant select on public.verification_documents to authenticated;
grant insert (user_id, doc_type, storage_path) on public.verification_documents to authenticated;
grant update (status, reviewed_by, reviewed_at, review_note) on public.verification_documents to authenticated;
grant delete on public.verification_documents to authenticated;
create policy vdocs_read on public.verification_documents for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy vdocs_insert_own on public.verification_documents for insert to authenticated
  with check (user_id = auth.uid());
create policy vdocs_review on public.verification_documents for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy vdocs_delete_own_pending on public.verification_documents for delete to authenticated
  using (user_id = auth.uid() and status = 'pending');

-- audit log: admins read; rows are written by security-definer functions
grant select on public.admin_audit_logs to authenticated;
create policy audit_read on public.admin_audit_logs for select to authenticated using (public.is_admin());

-- storage ----------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-docs', 'verification-docs', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types, public = excluded.public;

create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy vdocs_obj_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy vdocs_obj_read on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy vdocs_obj_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
