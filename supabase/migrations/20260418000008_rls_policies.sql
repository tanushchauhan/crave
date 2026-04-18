-- CRAVE: Row-Level Security (docs/supabase.md §8.1–§8.2; orders RLS in 20260418000011)

alter table public.users enable row level security;
alter table public.contacts enable row level security;
alter table public.dining_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.restaurants enable row level security;
alter table public.menu_items enable row level security;
alter table public.bookings enable row level security;
alter table public.dietary_constraints enable row level security;
alter table public.receipt_captures enable row level security;
alter table public.receipt_line_items enable row level security;
alter table public.bill_splits enable row level security;
alter table public.item_feedback enable row level security;
alter table public.user_pref_updates enable row level security;
alter table public.impressions enable row level security;
alter table public.menu_interactions enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_assets enable row level security;

-- Consumers
create policy users_select_self on public.users
  for select using (id = auth.uid ());

create policy users_update_self on public.users
  for update using (id = auth.uid ());

create policy contacts_all_owner on public.contacts
  for all using (owner_user_id = auth.uid ())
  with check (owner_user_id = auth.uid ());

create policy dining_groups_select_member on public.dining_groups
  for select using (
    owner_id = auth.uid ()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = dining_groups.id and gm.user_id = auth.uid ()
    )
  );

create policy dining_groups_insert_owner on public.dining_groups
  for insert with check (owner_id = auth.uid ());

create policy dining_groups_update_owner on public.dining_groups
  for update using (owner_id = auth.uid ());

create policy group_members_select_participant on public.group_members
  for select using (
    exists (
      select 1 from public.dining_groups dg
      where dg.id = group_members.group_id
        and (
          dg.owner_id = auth.uid ()
          or exists (
            select 1 from public.group_members gm2
            where gm2.group_id = dg.id and gm2.user_id = auth.uid ()
          )
        )
    )
  );

create policy group_members_write_owner on public.group_members
  for all using (
    exists (
      select 1 from public.dining_groups dg
      where dg.id = group_members.group_id and dg.owner_id = auth.uid ()
    )
  )
  with check (
    exists (
      select 1 from public.dining_groups dg
      where dg.id = group_members.group_id and dg.owner_id = auth.uid ()
    )
  );

-- Discovery data: any signed-in user can read restaurants and menus.
create policy restaurants_select_auth on public.restaurants
  for select to authenticated using (true);

create policy menu_items_select_auth on public.menu_items
  for select to authenticated using (true);

create policy restaurants_update_owner on public.restaurants
  for update using (owner_user_id = auth.uid ())
  with check (owner_user_id = auth.uid ());

create policy menu_items_insert_owner on public.menu_items
  for insert with check (
    exists (
      select 1 from public.restaurants r
      where r.id = menu_items.restaurant_id and r.owner_user_id = auth.uid ()
    )
  );

create policy menu_items_update_owner on public.menu_items
  for update using (
    exists (
      select 1 from public.restaurants r
      where r.id = menu_items.restaurant_id and r.owner_user_id = auth.uid ()
    )
  );

create policy menu_items_delete_owner on public.menu_items
  for delete using (
    exists (
      select 1 from public.restaurants r
      where r.id = menu_items.restaurant_id and r.owner_user_id = auth.uid ()
    )
  );

create policy bookings_select_participant on public.bookings
  for select using (
    user_id = auth.uid ()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = bookings.group_id and gm.user_id = auth.uid ()
    )
    or exists (
      select 1 from public.restaurants r
      where r.id = bookings.restaurant_id and r.owner_user_id = auth.uid ()
    )
  );

create policy bookings_insert_authenticated on public.bookings
  for insert with check (user_id = auth.uid ());

create policy dietary_all_self on public.dietary_constraints
  for all using (user_id = auth.uid ())
  with check (user_id = auth.uid ());

create policy receipt_captures_select_owner_or_staff on public.receipt_captures
  for select using (
    user_id = auth.uid ()
    or exists (
      select 1 from public.bookings b
      join public.restaurants r on r.id = b.restaurant_id
      where b.id = receipt_captures.booking_id and r.owner_user_id = auth.uid ()
    )
  );

create policy receipt_captures_insert_self on public.receipt_captures
  for insert with check (user_id = auth.uid ());

create policy receipt_captures_update_self on public.receipt_captures
  for update using (user_id = auth.uid ());

create policy receipt_line_items_rw_receipt_owner on public.receipt_line_items
  for all using (
    exists (
      select 1 from public.receipt_captures rc
      where rc.id = receipt_line_items.receipt_id and rc.user_id = auth.uid ()
    )
  )
  with check (
    exists (
      select 1 from public.receipt_captures rc
      where rc.id = receipt_line_items.receipt_id and rc.user_id = auth.uid ()
    )
  );

create policy bill_splits_select_self_or_staff on public.bill_splits
  for select using (
    user_id = auth.uid ()
    or exists (
      select 1 from public.receipt_captures rc
      join public.bookings b on b.id = rc.booking_id
      join public.restaurants r on r.id = b.restaurant_id
      where rc.id = bill_splits.receipt_id and r.owner_user_id = auth.uid ()
    )
  );

create policy bill_splits_insert_self on public.bill_splits
  for insert with check (
    exists (
      select 1 from public.receipt_captures rc
      where rc.id = bill_splits.receipt_id and rc.user_id = auth.uid ()
    )
  );

create policy item_feedback_insert_self on public.item_feedback
  for insert with check (user_id = auth.uid ());

create policy item_feedback_select_self_or_staff on public.item_feedback
  for select using (
    user_id = auth.uid ()
    or exists (
      select 1 from public.restaurants r
      where r.id = item_feedback.restaurant_id and r.owner_user_id = auth.uid ()
    )
  );

create policy user_pref_updates_select_self on public.user_pref_updates
  for select using (user_id = auth.uid ());

create policy impressions_insert_auth on public.impressions
  for insert to authenticated with check (true);

create policy impressions_select_staff_same_restaurant on public.impressions
  for select using (
    exists (
      select 1 from public.restaurants r
      where r.id = impressions.restaurant_id and r.owner_user_id = auth.uid ()
    )
  );

create policy menu_interactions_insert_auth on public.menu_interactions
  for insert to authenticated with check (true);

create policy menu_interactions_select_staff on public.menu_interactions
  for select using (
    exists (
      select 1 from public.menu_items mi
      join public.restaurants r on r.id = mi.restaurant_id
      where mi.id = menu_interactions.menu_item_id and r.owner_user_id = auth.uid ()
    )
  );

create policy ad_campaigns_staff_rw on public.ad_campaigns
  for all using (
    exists (
      select 1 from public.restaurants r
      where r.id = ad_campaigns.restaurant_id and r.owner_user_id = auth.uid ()
    )
  )
  with check (
    exists (
      select 1 from public.restaurants r
      where r.id = ad_campaigns.restaurant_id and r.owner_user_id = auth.uid ()
    )
  );

create policy ad_assets_staff_rw on public.ad_assets
  for all using (
    exists (
      select 1 from public.ad_campaigns c
      join public.restaurants r on r.id = c.restaurant_id
      where c.id = ad_assets.campaign_id and r.owner_user_id = auth.uid ()
    )
  )
  with check (
    exists (
      select 1 from public.ad_campaigns c
      join public.restaurants r on r.id = c.restaurant_id
      where c.id = ad_assets.campaign_id and r.owner_user_id = auth.uid ()
    )
  );
