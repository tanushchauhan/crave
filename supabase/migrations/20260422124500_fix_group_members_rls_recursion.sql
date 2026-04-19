-- CRAVE: Fix "infinite recursion detected in policy for relation group_members".
-- The previous group_members_select_participant used EXISTS (select from group_members gm2 ...),
-- which re-evaluated RLS on group_members for each scanned row. Use SECURITY DEFINER instead.

set search_path = public;

create or replace function public.auth_is_member_of_dining_group (p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid ()
  );
$$;

revoke all on function public.auth_is_member_of_dining_group (uuid) from public;
grant execute on function public.auth_is_member_of_dining_group (uuid) to authenticated;

drop policy if exists group_members_select_participant on public.group_members;

create policy group_members_select_participant on public.group_members
  for select to authenticated
  using (
    user_id = auth.uid ()
    or public.dining_group_owner_is_caller (group_id)
    or public.auth_is_member_of_dining_group (group_id)
  );

notify pgrst, 'reload schema';
