-- CRAVE: voice-driven orders + Live Orders Realtime (docs/supabase.md §6.4, §9; plan.md §2 / §4.1)

create type public.order_status as enum (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled'
);

create table public.orders (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  status public.order_status not null default 'pending',
  total_cents integer not null check (total_cents >= 0),
  voice_transcript_summary text,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete restrict,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  price_cents integer not null check (price_cents >= 0)
);

create index orders_restaurant_created_at on public.orders (restaurant_id, created_at desc);
create index order_items_order on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy orders_insert_own on public.orders
  for insert with check (user_id = auth.uid ());

create policy orders_select_owner_or_restaurant_owner on public.orders
  for select using (
    user_id = auth.uid ()
    or exists (
      select 1 from public.restaurants r
      where r.id = orders.restaurant_id and r.owner_user_id = auth.uid ()
    )
  );

create policy orders_update_restaurant_owner on public.orders
  for update using (
    exists (
      select 1 from public.restaurants r
      where r.id = orders.restaurant_id and r.owner_user_id = auth.uid ()
    )
  );

create policy order_items_select_via_order on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (
          o.user_id = auth.uid ()
          or exists (
            select 1 from public.restaurants r
            where r.id = o.restaurant_id and r.owner_user_id = auth.uid ()
          )
        )
    )
  );

create policy order_items_insert_via_order_owner on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid ()
    )
  );

alter publication supabase_realtime add table public.orders;

-- B2B chatbot: order volume (docs/supabase.md §8.3); defined here because it references public.orders.
create or replace function public.get_order_summary (p_restaurant_id uuid, p_days int default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz := now() - (p_days::text || ' days')::interval;
begin
  perform public.assert_restaurant_owner (p_restaurant_id);

  return coalesce(
    (
      select jsonb_build_object(
        'restaurant_id', p_restaurant_id,
        'since', since,
        'order_count', count(*)::bigint,
        'total_revenue_cents', coalesce(sum(o.total_cents), 0)::bigint,
        'pending_count', count(*) filter (where o.status = 'pending')::bigint
      )
      from public.orders o
      where o.restaurant_id = p_restaurant_id
        and o.created_at >= since
    ),
    jsonb_build_object(
      'restaurant_id', p_restaurant_id,
      'since', since,
      'order_count', 0,
      'total_revenue_cents', 0,
      'pending_count', 0
    )
  );
end;
$$;

grant execute on function public.get_order_summary (uuid, int) to authenticated;
