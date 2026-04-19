-- CRAVE: Allow dining group owners and co-members to read each other's public profile fields (phone, display_name) for the Groups UI.

set search_path = public;

create policy users_select_group_peers on public.users
  for select to authenticated
  using (
    exists (
      select 1
      from public.group_members gm_self
      join public.group_members gm_other
        on gm_other.group_id = gm_self.group_id
        and gm_other.user_id = users.id
      where gm_self.user_id = auth.uid ()
    )
    or exists (
      select 1
      from public.dining_groups dg
      join public.group_members gm
        on gm.group_id = dg.id
        and gm.user_id = users.id
      where dg.owner_id = auth.uid ()
    )
  );

notify pgrst, 'reload schema';
