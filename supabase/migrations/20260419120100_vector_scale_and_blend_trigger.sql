-- pgvector defines * as element-wise vector*vector only (no scalar multiply). Scale via text round-trip (1536 dims from Titan are plain decimals).
set search_path = public, extensions;

create or replace function public.vector_scale_fp (v vector(1536), s double precision)
returns vector(1536)
language plpgsql
immutable
parallel safe
as $$
declare
  parts text[];
  el text;
  acc text[] := '{}';
begin
  if v is null or s is null then
    return null;
  end if;
  parts := string_to_array(btrim(v::text, '[]'), ',');
  foreach el in array parts loop
    acc := array_append(acc, (trim(el)::double precision * s)::text);
  end loop;
  return ('[' || array_to_string(acc, ',') || ']')::vector (1536);
end;
$$;

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
    v_new := public.vector_scale_fp (v_item, w);
  else
    v_new := public.vector_scale_fp (v_old, 0.85::double precision) + public.vector_scale_fp (v_item, w);
  end if;

  norm := v_new <-> z;

  if norm is not null and norm > 1e-12 then
    v_new := public.vector_scale_fp (v_new, 1.0 / norm);
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
