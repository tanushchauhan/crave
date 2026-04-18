-- CRAVE: impressions, menu_interactions, ad tables per docs/supabase.md §6.8

create table public.impressions (
  id uuid primary key default gen_random_uuid (),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  source text,
  context_tag text,
  created_at timestamptz not null default now()
);

create table public.menu_interactions (
  id uuid primary key default gen_random_uuid (),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);

create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid (),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  prompt text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.ad_assets (
  id uuid primary key default gen_random_uuid (),
  campaign_id uuid not null references public.ad_campaigns (id) on delete cascade,
  type text not null,
  s3_url text not null,
  generation_meta jsonb,
  created_at timestamptz not null default now()
);
