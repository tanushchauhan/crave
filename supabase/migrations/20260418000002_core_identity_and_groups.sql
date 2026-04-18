-- CRAVE: enums + users/contacts/dining_groups + auth mirror trigger per docs/supabase.md §6.2

set search_path = public, extensions;

create type public.booking_source as enum ('partner_app', 'phone_call_logged');
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed');
create type public.receipt_capture_status as enum (
  'uploaded',
  'ocr_done',
  'split_sent',
  'feedback_collected'
);
create type public.match_method as enum ('exact', 'trigram', 'embedding', 'manual');
create type public.payment_method as enum ('venmo', 'cashapp', 'iou');
create type public.pref_update_source as enum ('bill_split_feedback', 'booking', 'onboarding');
create type public.feedback_source as enum ('bill_split', 'doordash', 'uber_eats');

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text,
  display_name text,
  location_geog geography (point, 4326),
  pref_embedding vector (1536),
  venmo_handle text,
  cashapp_handle text,
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid (),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  contact_user_id uuid references public.users (id) on delete set null,
  label text,
  created_at timestamptz not null default now(),
  unique (owner_user_id, contact_user_id)
);

create table public.dining_groups (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  owner_id uuid not null references public.users (id) on delete cascade,
  context_tag text,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.dining_groups (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create or replace function public.handle_new_auth_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, phone)
  values (new.id, coalesce(new.phone, new.raw_user_meta_data ->> 'phone'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
execute function public.handle_new_auth_user ();
