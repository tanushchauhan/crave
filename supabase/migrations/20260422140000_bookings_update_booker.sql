-- CRAVE: Allow the booking requester to update their own rows (e.g. dietary_notes from the Reservations tab).
-- MVP: booker-only; broader participant updates can be added later if needed.

set search_path = public;

create policy bookings_update_booker on public.bookings
  for update to authenticated
  using (user_id = auth.uid ())
  with check (user_id = auth.uid ());

notify pgrst, 'reload schema';
