-- CRAVE: Fix "infinite recursion detected in policy for relation dining_groups".
-- dining_groups_select_member referenced group_members; group_members_select referenced dining_groups
-- under RLS. SECURITY DEFINER helper reads dining_groups as definer (owner bypasses RLS on that read).

set search_path = public;

create or replace function public.dining_group_owner_is_caller (p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dining_groups dg
    where dg.id = p_group_id
      and dg.owner_id = auth.uid ()
  );
$$;

revoke all on function public.dining_group_owner_is_caller (uuid) from public;
grant execute on function public.dining_group_owner_is_caller (uuid) to authenticated;

drop policy if exists group_members_select_participant on public.group_members;

create policy group_members_select_participant on public.group_members
  for select to authenticated
  using (
    user_id = auth.uid ()
    or public.dining_group_owner_is_caller (group_id)
    or exists (
      select 1
      from public.group_members gm2
      where gm2.group_id = group_members.group_id
        and gm2.user_id = auth.uid ()
    )
  );

drop policy if exists group_members_write_owner on public.group_members;

create policy group_members_write_owner on public.group_members
  for all to authenticated
  using (public.dining_group_owner_is_caller (group_id))
  with check (public.dining_group_owner_is_caller (group_id));

notify pgrst, 'reload schema';
