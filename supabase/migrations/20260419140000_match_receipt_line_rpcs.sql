-- CRAVE: receipt line matching stages 1–2 (exact, trigram) + stage 3 helper (embedding) per docs/plan.md §3.3 step 4.
-- Invoked from Edge match-receipt-items with service_role; SECURITY DEFINER.

set search_path = public, extensions;

create or replace function public.match_receipt_lines_exact_and_trigram (p_receipt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  rid uuid;
  n_exact int := 0;
  n_trigram int := 0;
  rli record;
  best_id uuid;
  best_sim float;
begin
  select b.restaurant_id into rid
  from public.receipt_captures rc
  join public.bookings b on b.id = rc.booking_id
  where rc.id = p_receipt_id;

  if rid is null then
    return jsonb_build_object('error', 'restaurant_not_found', 'receipt_id', p_receipt_id);
  end if;

  update public.receipt_line_items rli
  set
    matched_menu_item_id = mi.id,
    match_method = 'exact'::public.match_method,
    match_confidence = 1.0
  from public.menu_items mi
  where
    rli.receipt_id = p_receipt_id
    and rli.matched_menu_item_id is null
    and mi.restaurant_id = rid
    and mi.is_available = true
    and lower(trim(both from mi.name)) = lower(trim(both from rli.raw_text));
  get diagnostics n_exact = row_count;

  for rli in
    select id, raw_text
    from public.receipt_line_items
    where
      receipt_id = p_receipt_id
      and matched_menu_item_id is null
  loop
    select mi.id, similarity(mi.name, rli.raw_text) as sim
      into best_id, best_sim
    from public.menu_items mi
    where
      mi.restaurant_id = rid
      and mi.is_available = true
    order by similarity(mi.name, rli.raw_text) desc
    limit 1;

    if best_id is not null and best_sim is not null and best_sim > 0.4 then
      update public.receipt_line_items
      set
        matched_menu_item_id = best_id,
        match_method = 'trigram'::public.match_method,
        match_confidence = best_sim::double precision
      where id = rli.id;
      n_trigram := n_trigram + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'restaurant_id',
    rid,
    'exact',
    n_exact,
    'trigram',
    n_trigram
  );
end;
$$;

revoke all on function public.match_receipt_lines_exact_and_trigram (uuid) from public;
grant execute on function public.match_receipt_lines_exact_and_trigram (uuid) to service_role;

create or replace function public.match_receipt_line_embedding (
  p_line_id uuid,
  p_restaurant_id uuid,
  p_query text,
  p_max_distance float default 0.45
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  best_id uuid;
  best_dist float;
  vq vector(1536);
begin
  vq := p_query::vector(1536);

  select mi.id, (mi.embedding <=> vq) as d
    into best_id, best_dist
  from public.menu_items mi
  where
    mi.restaurant_id = p_restaurant_id
    and mi.is_available = true
    and mi.embedding is not null
  order by mi.embedding <=> vq asc
  limit 1;

  if best_id is null or best_dist is null or best_dist > p_max_distance then
    return jsonb_build_object('matched', false);
  end if;

  update public.receipt_line_items
  set
    matched_menu_item_id = best_id,
    match_method = 'embedding'::public.match_method,
    match_confidence = greatest(
      0.0::double precision,
      least(1.0::double precision, (1.0::double precision - best_dist::double precision))
    )
  where
    id = p_line_id
    and matched_menu_item_id is null;

  if found then
    return jsonb_build_object(
      'matched',
      true,
      'menu_item_id',
      best_id,
      'distance',
      best_dist
    );
  end if;

  return jsonb_build_object('matched', false, 'reason', 'line_already_matched');
end;
$$;

revoke all on function public.match_receipt_line_embedding (uuid, uuid, text, float) from public;
grant execute on function public.match_receipt_line_embedding (uuid, uuid, text, float) to service_role;
