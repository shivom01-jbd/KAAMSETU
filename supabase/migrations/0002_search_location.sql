-- KAAMSETU milestone 4: coarse location, rating columns, search function. Also fixes a 0001 grant gap.

-- FIX: the app reads profiles.is_suspended for the signed-in user; 0001 did not grant that column.
grant select (is_suspended) on public.profiles to authenticated;

-- Only a COARSE point (rounded to 0.01 degree, about 1 km) is stored. Exact coordinates are never saved.
alter table public.professional_profiles
  add column approx_lat double precision check (approx_lat between 6 and 38),
  add column approx_lng double precision check (approx_lng between 68 and 98),
  add column rating_avg numeric(2, 1) check (rating_avg between 0 and 5),
  add column rating_count integer not null default 0 check (rating_count >= 0),
  add constraint approx_pair check ((approx_lat is null) = (approx_lng is null)),
  add constraint approx_coarse check (
    approx_lat is null or (approx_lat = round(approx_lat::numeric, 2) and approx_lng = round(approx_lng::numeric, 2)));

-- Users may set their coarse area. rating_* is NOT granted: a trigger fills it in milestone 6.
grant insert (approx_lat, approx_lng) on public.professional_profiles to authenticated;
grant update (approx_lat, approx_lng) on public.professional_profiles to authenticated;
create index pro_approx_idx on public.professional_profiles (approx_lat, approx_lng) where is_listed;

-- SECURITY INVOKER: runs with the caller's RLS. Distance uses haversine (PostGIS is a later scale option).
create function public.search_professionals(
  p_category uuid default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_max_km integer default 25,
  p_available_only boolean default false,
  p_price_min integer default null,
  p_price_max integer default null,
  p_min_rating numeric default null,
  p_limit integer default 30
) returns table (
  user_id uuid, full_name text, category_id uuid, city text, area_label text,
  price_min_inr integer, price_max_inr integer, experience_years smallint, is_available boolean,
  rating_avg numeric, rating_count integer, verification_status public.verification_status,
  approx_lat double precision, approx_lng double precision, distance_km double precision
) language sql stable security invoker set search_path = '' as $$
  with base as (
    select pp.*, pr.full_name,
      case when p_lat is null or p_lng is null or pp.approx_lat is null then null
      else 6371 * 2 * asin(sqrt(least(1,
        power(sin(radians(pp.approx_lat - p_lat) / 2), 2)
        + cos(radians(p_lat)) * cos(radians(pp.approx_lat)) * power(sin(radians(pp.approx_lng - p_lng) / 2), 2)))) end as dist
    from public.professional_profiles pp
    join public.profiles pr on pr.id = pp.user_id
    where pp.is_listed and not pr.is_suspended
      and (p_category is null or pp.category_id = p_category)
      and (not p_available_only or pp.is_available)
      and (p_price_min is null or pp.price_max_inr is null or pp.price_max_inr >= p_price_min)
      and (p_price_max is null or pp.price_min_inr is null or pp.price_min_inr <= p_price_max)
      and (p_min_rating is null or pp.rating_avg >= p_min_rating)
  )
  select b.user_id, b.full_name, b.category_id, b.city, b.area_label, b.price_min_inr, b.price_max_inr,
         b.experience_years, b.is_available, b.rating_avg, b.rating_count, b.verification_status,
         b.approx_lat, b.approx_lng, b.dist
  from base b
  where (p_lat is null or p_lng is null
         or (b.dist is not null
             and b.dist <= least(greatest(p_max_km, 1), 200)
             and b.dist <= b.service_radius_km + 1.5))  -- 1.5 km tolerance for coordinate rounding
  order by b.dist nulls last, b.rating_avg desc nulls last, b.user_id
  limit least(greatest(p_limit, 1), 50)
$$;
revoke all on function public.search_professionals(uuid, double precision, double precision, integer, boolean, integer, integer, numeric, integer) from public, anon;
grant execute on function public.search_professionals(uuid, double precision, double precision, integer, boolean, integer, integer, numeric, integer) to authenticated;
