-- CRAVE: restaurants + menu_items + HNSW/trigram/GiST indexes per docs/supabase.md §6.3

create table public.restaurants (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  cuisine_tags text[] default '{}',
  price_tier smallint check (price_tier between 1 and 4),
  location_geog geography (point, 4326),
  embedding vector (1536),
  image_embedding vector (1024),
  hours jsonb default '{}',
  photo_urls text[] default '{}',
  yelp_id text,
  google_place_id text,
  phone_e164 text,
  is_crave_partner boolean not null default false,
  owner_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid (),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  image_url text,
  embedding vector (1536),
  image_embedding vector (1024),
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create index restaurants_embedding_hnsw on public.restaurants
  using hnsw (embedding vector_cosine_ops);
create index restaurants_image_embedding_hnsw on public.restaurants
  using hnsw (image_embedding vector_cosine_ops);
create index menu_items_embedding_hnsw on public.menu_items
  using hnsw (embedding vector_cosine_ops);
create index menu_items_name_trgm on public.menu_items using gin (name gin_trgm_ops);
create index restaurants_location_gist on public.restaurants using gist (location_geog);
