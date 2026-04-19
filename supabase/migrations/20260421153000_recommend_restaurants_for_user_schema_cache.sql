-- CRAVE: Ensure recommend_restaurants_for_user (geo) exists for PostgREST and reload schema cache.
-- Fixes "Could not find the function ... in the schema cache" when migrations were skipped or cache is stale.

set search_path = public, extensions;

drop function if exists public.recommend_restaurants_for_user (integer);
drop function if exists public.recommend_restaurants_for_user (
  integer,
  double precision,
  double precision,
  double precision
);
drop function if exists public.recommend_restaurants_for_user (
  double precision,
  integer,
  double precision,
  double precision
);

create or replace function public.recommend_restaurants_for_user (
  p_limit integer default 12,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m double precision default null
)
returns table (
  restaurant_id uuid,
  name text,
  cuisine_tags text[],
  photo_urls text[],
  hours jsonb,
  price_tier smallint,
  similarity double precision
)
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  v_pref vector(1536);
  v_lim integer := greatest(1, least(coalesce(p_limit, 12), 50));
  v_radius double precision := greatest(
    500::double precision,
    least(coalesce(p_radius_m, 5000::double precision), 50000::double precision)
  );
  v_use_geo boolean := p_lat is not null
    and p_lng is not null
    and p_lat between -90::double precision and 90::double precision
    and p_lng between -180::double precision and 180::double precision;
  v_rowcount bigint;
begin
  select u.pref_embedding into v_pref
  from public.users u
  where u.id = auth.uid ();

  if v_pref is not null then
    if v_use_geo then
      return query
      select
        r.id,
        r.name,
        r.cuisine_tags,
        r.photo_urls,
        r.hours,
        r.price_tier,
        (r.embedding <=> v_pref)::double precision
      from public.restaurants r
      where r.embedding is not null
        and r.location_geog is not null
        and ST_DWithin(
          r.location_geog,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          v_radius
        )
      order by r.embedding <=> v_pref
      limit v_lim;
      get diagnostics v_rowcount = ROW_COUNT;
      if v_rowcount > 0 then
        return;
      end if;
    end if;

    return query
    select
      r.id,
      r.name,
      r.cuisine_tags,
      r.photo_urls,
      r.hours,
      r.price_tier,
      (r.embedding <=> v_pref)::double precision
    from public.restaurants r
    where r.embedding is not null
    order by r.embedding <=> v_pref
    limit v_lim;
  else
    if v_use_geo then
      return query
      select
        r.id,
        r.name,
        r.cuisine_tags,
        r.photo_urls,
        r.hours,
        r.price_tier,
        null::double precision
      from public.restaurants r
      where r.location_geog is not null
        and ST_DWithin(
          r.location_geog,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          v_radius
        )
      order by r.is_crave_partner desc nulls last, r.created_at desc
      limit v_lim;
      get diagnostics v_rowcount = ROW_COUNT;
      if v_rowcount > 0 then
        return;
      end if;
    end if;

    return query
    select
      r.id,
      r.name,
      r.cuisine_tags,
      r.photo_urls,
      r.hours,
      r.price_tier,
      null::double precision
    from public.restaurants r
    order by r.is_crave_partner desc nulls last, r.created_at desc
    limit v_lim;
  end if;
end;
$$;

grant execute on function public.recommend_restaurants_for_user (
  integer,
  double precision,
  double precision,
  double precision
) to authenticated;

notify pgrst, 'reload schema';
