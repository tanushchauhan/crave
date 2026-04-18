-- CRAVE: bookings + dietary_constraints per docs/supabase.md §6.5

create table public.bookings (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.users (id) on delete cascade,
  group_id uuid references public.dining_groups (id) on delete set null,
  restaurant_id uuid references public.restaurants (id) on delete set null,
  party_size smallint not null check (party_size > 0),
  scheduled_at timestamptz,
  status public.booking_status not null default 'pending',
  source public.booking_source not null,
  voice_transcript text,
  dietary_notes text,
  context_tag text,
  created_at timestamptz not null default now()
);

create index bookings_restaurant_created_at on public.bookings (restaurant_id, created_at desc);
create index bookings_user_created_at on public.bookings (user_id, created_at desc);

create table public.dietary_constraints (
  user_id uuid not null references public.users (id) on delete cascade,
  constraint_type text not null,
  hard boolean not null default true,
  primary key (user_id, constraint_type)
);
