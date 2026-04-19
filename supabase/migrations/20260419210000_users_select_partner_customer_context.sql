-- B2B dashboard: let restaurant owners read public.users for guests who booked or
-- ordered at their venue (e.g. phone on Live Bookings). Applies in addition to
-- users_select_self (permissive policies OR). Does not alter table definitions.
--
-- Note: any SELECTable column on public.users is visible in this context, not only
-- phone. Tighten later with a view + RLS if least-privilege is required.

create policy users_select_partner_customer_context on public.users
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      inner join public.restaurants r on r.id = b.restaurant_id
      where b.user_id = public.users.id
        and r.owner_user_id = auth.uid ()
    )
    or exists (
      select 1
      from public.orders o
      inner join public.restaurants r on r.id = o.restaurant_id
      where o.user_id = public.users.id
        and r.owner_user_id = auth.uid ()
    )
  );
