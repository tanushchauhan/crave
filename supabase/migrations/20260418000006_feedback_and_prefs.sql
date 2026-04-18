-- CRAVE: item_feedback + user_pref_updates + preference blend trigger (docs/supabase.md §6.7, §12; plan.md §3.3)

create table public.item_feedback (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  raw_item_text text,
  liked boolean not null,
  source public.feedback_source not null default 'bill_split',
  created_at timestamptz not null default now()
);

create index item_feedback_restaurant_menu on public.item_feedback (restaurant_id, menu_item_id);

create table public.user_pref_updates (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.users (id) on delete cascade,
  delta_embedding vector (1536),
  source public.pref_update_source not null,
  applied boolean not null default false,
  created_at timestamptz not null default now()
);

create index user_pref_updates_pending on public.user_pref_updates (user_id)
  where applied = false;

-- Zero vector helper (L2 distance to zero equals the vector norm).
create or replace function public.zero_vector_1536 ()
returns vector(1536)
language sql
immutable
as $$
  select ('[' || repeat('0,', 1535) || '0]')::vector (1536);
$$;

create or replace function public.blend_pref_embedding_from_feedback ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old vector(1536);
  v_item vector(1536);
  v_new vector(1536);
  v_delta vector(1536);
  w double precision;
  norm double precision;
  z vector(1536) := public.zero_vector_1536 ();
begin
  if new.source is distinct from 'bill_split'::public.feedback_source then
    return new;
  end if;
  if new.menu_item_id is null then
    return new;
  end if;

  select u.pref_embedding, mi.embedding
    into v_old, v_item
  from public.users u
  join public.menu_items mi on mi.id = new.menu_item_id
  where u.id = new.user_id;

  if v_item is null then
    return new;
  end if;

  w := case when new.liked then 0.15::double precision else -0.10::double precision end;

  if v_old is null then
    v_new := (w * v_item)::vector (1536);
  else
    v_new := ((0.85::double precision * v_old) + (w * v_item))::vector (1536);
  end if;

  -- pgvector: L2 distance to the zero vector is the Euclidean norm.
  norm := v_new <-> z;

  if norm is not null and norm > 1e-12 then
    v_new := (v_new / norm)::vector (1536);
  end if;

  update public.users
  set pref_embedding = v_new
  where id = new.user_id;

  -- docs/supabase.md §12: persist the applied change vector (new minus prior) in delta_embedding.
  v_delta := (v_new - coalesce(v_old, z))::vector (1536);

  insert into public.user_pref_updates (user_id, delta_embedding, source, applied)
  values (new.user_id, v_delta, 'bill_split_feedback'::public.pref_update_source, true);

  return new;
end;
$$;

create trigger trg_item_feedback_update_pref
  after insert on public.item_feedback
  for each row
execute function public.blend_pref_embedding_from_feedback ();
