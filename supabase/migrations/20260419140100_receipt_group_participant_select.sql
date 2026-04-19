-- CRAVE: allow booking group members to read receipt rows for shared bill-split UX (multi-device) per integration plan.

-- SELECT: anyone in the booking's dining group can see captures + lines (writes stay uploader-only).
create policy receipt_captures_select_group_member on public.receipt_captures
  for select using (
    exists (
      select 1
      from public.bookings b
      join public.group_members gm on gm.group_id = b.group_id
      where
        b.id = receipt_captures.booking_id
        and gm.user_id = auth.uid ()
    )
  );

create policy receipt_line_items_select_group_member on public.receipt_line_items
  for select using (
    exists (
      select 1
      from public.receipt_captures rc
      join public.bookings b on b.id = rc.booking_id
      join public.group_members gm on gm.group_id = b.group_id
      where
        rc.id = receipt_line_items.receipt_id
        and gm.user_id = auth.uid ()
    )
  );
