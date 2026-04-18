-- CRAVE: Realtime publication for partner bookings feed (docs/supabase.md §9.1–§9.2; plan.md §4.3). Orders added in migration 11.

alter publication supabase_realtime add table public.bookings;
