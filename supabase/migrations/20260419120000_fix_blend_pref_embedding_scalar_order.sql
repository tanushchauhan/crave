-- pgvector scalar multiply is vector * float8, not float8 * vector (PostgreSQL operator resolution).
set search_path = public, extensions;

create or replace function public.blend_pref_embedding_from_feedback ()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
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
    v_new := (v_item * w)::vector (1536);
  else
    v_new := ((v_old * 0.85::double precision) + (v_item * w))::vector (1536);
  end if;

  norm := v_new <-> z;

  if norm is not null and norm > 1e-12 then
    v_new := (v_new / norm)::vector (1536);
  end if;

  update public.users
  set pref_embedding = v_new
  where id = new.user_id;

  v_delta := (v_new - coalesce(v_old, z))::vector (1536);

  insert into public.user_pref_updates (user_id, delta_embedding, source, applied)
  values (new.user_id, v_delta, 'bill_split_feedback'::public.pref_update_source, true);

  return new;
end;
$$;
