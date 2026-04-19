-- CRAVE: RPC for Edge + mobile recommendations (pgvector cosine vs users.pref_embedding; fallback when pref is null).

set search_path = public, extensions;

create or replace function public.recommend_restaurants_for_user (p_limit integer default 12)
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
begin
  select u.pref_embedding into v_pref
  from public.users u
  where u.id = auth.uid ();

  if v_pref is not null then
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

grant execute on function public.recommend_restaurants_for_user (integer) to authenticated;
