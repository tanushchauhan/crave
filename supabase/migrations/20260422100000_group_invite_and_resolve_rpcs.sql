-- CRAVE: group invite phone lookup (owner-only) + member list with prefs for voice resolve-group.

set search_path = public, extensions;

-- Owner of p_group_id may resolve a registered user's id by E.164 phone (for group_members insert).
create or replace function public.lookup_user_id_for_group_invite (
  p_group_id uuid,
  p_phone_e164 text
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid ();
  v_phone text;
  v_uid uuid;
begin
  if v_caller is null then
    return null;
  end if;

  if not exists (
    select 1
    from public.dining_groups dg
    where dg.id = p_group_id
      and dg.owner_id = v_caller
  ) then
    return null;
  end if;

  v_phone := nullif(trim(both from p_phone_e164), '');
  if v_phone is null then
    return null;
  end if;

  select u.id into v_uid
  from public.users u
  where u.phone is not null
    and trim(u.phone) = v_phone
  limit 1;

  return v_uid;
end;
$$;

grant execute on function public.lookup_user_id_for_group_invite (uuid, text) to authenticated;

-- Callers who are owner or member of the group get member rows + preference vectors (voice resolve_group).
create or replace function public.list_group_members_with_prefs (p_group_id uuid)
returns table (
  user_id uuid,
  phone text,
  display_name text,
  pref_embedding vector(1536)
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid ();
begin
  if v_caller is null then
    return;
  end if;

  if not exists (
    select 1
    from public.dining_groups dg
    where dg.id = p_group_id
      and (
        dg.owner_id = v_caller
        or exists (
          select 1
          from public.group_members gm
          where gm.group_id = dg.id
            and gm.user_id = v_caller
        )
      )
  ) then
    return;
  end if;

  return query
  select
    u.id,
    u.phone,
    u.display_name,
    u.pref_embedding
  from public.group_members gm
  join public.users u on u.id = gm.user_id
  where gm.group_id = p_group_id;
end;
$$;

grant execute on function public.list_group_members_with_prefs (uuid) to authenticated;

notify pgrst, 'reload schema';
