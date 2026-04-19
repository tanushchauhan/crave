-- B2B signup: link or create restaurant by name for auth.uid().
-- SECURITY DEFINER bypasses RLS for insert/update on restaurants.
-- Does not alter table definitions; adds one function + grants only.

set search_path = public;

create or replace function public.register_restaurant_on_signup (p_restaurant_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid ();
  v_trimmed text;
  v_match_count integer;
  v_rid uuid;
  v_existing_owner uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_trimmed := trim(p_restaurant_name);
  if v_trimmed = '' then
    raise exception 'empty_restaurant_name';
  end if;

  select count(*)::integer into v_match_count
  from public.restaurants r
  where lower(trim(r.name)) = lower(v_trimmed);

  if v_match_count > 1 then
    raise exception 'ambiguous_restaurant_name';
  end if;

  if v_match_count = 1 then
    select r.id, r.owner_user_id into v_rid, v_existing_owner
    from public.restaurants r
    where lower(trim(r.name)) = lower(v_trimmed)
    order by r.created_at asc
    limit 1;

    if v_existing_owner is not null and v_existing_owner <> v_uid then
      raise exception 'restaurant_already_claimed';
    end if;

    update public.restaurants
    set
      owner_user_id = v_uid
    where id = v_rid
      and (owner_user_id is null or owner_user_id = v_uid);

    return v_rid;
  end if;

  insert into public.restaurants (name, owner_user_id)
  values (v_trimmed, v_uid)
  returning id into v_rid;

  return v_rid;
end;
$$;

grant execute on function public.register_restaurant_on_signup (text) to authenticated;
