-- Remote migration history includes a second entry with this name (MCP duplicate apply).
-- Idempotent: same definition as 20260419113328_get_dashboard_kpis.sql.

create or replace function public.get_dashboard_kpis (p_restaurant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  day_start timestamptz := date_trunc ('day', (now() at time zone 'UTC'));
  day_end timestamptz := day_start + interval '1 day';
  y_start timestamptz := day_start - interval '1 day';
  y_end timestamptz := day_start;
  w_cur_start timestamptz := day_start - interval '7 day';
  w_prev_start timestamptz := day_start - interval '14 day';
  today_b int;
  yday_b int;
  avg_curr numeric;
  avg_prev numeric;
  cov_curr bigint;
  cov_prev bigint;
  pos_curr numeric;
  pos_prev numeric;
begin
  perform public.assert_restaurant_owner (p_restaurant_id);

  select count(*)::int into today_b
  from public.bookings b
  where b.restaurant_id = p_restaurant_id
    and b.created_at >= day_start
    and b.created_at < day_end;

  select count(*)::int into yday_b
  from public.bookings b
  where b.restaurant_id = p_restaurant_id
    and b.created_at >= y_start
    and b.created_at < y_end;

  select coalesce(avg(b.party_size), 0)::numeric into avg_curr
  from public.bookings b
  where b.restaurant_id = p_restaurant_id
    and b.created_at >= w_cur_start
    and b.created_at < day_end;

  select coalesce(avg(b.party_size), 0)::numeric into avg_prev
  from public.bookings b
  where b.restaurant_id = p_restaurant_id
    and b.created_at >= w_prev_start
    and b.created_at < w_cur_start;

  select coalesce(sum(b.party_size), 0)::bigint into cov_curr
  from public.bookings b
  where b.restaurant_id = p_restaurant_id
    and b.created_at >= w_cur_start
    and b.created_at < day_end;

  select coalesce(sum(b.party_size), 0)::bigint into cov_prev
  from public.bookings b
  where b.restaurant_id = p_restaurant_id
    and b.created_at >= w_prev_start
    and b.created_at < w_cur_start;

  select
    case
      when count(*) > 0 then 100.0 * count(*) filter (where liked) / count(*)
      else 0::numeric
    end into pos_curr
  from public.item_feedback fb
  where fb.restaurant_id = p_restaurant_id
    and fb.created_at >= w_cur_start
    and fb.created_at < day_end;

  select
    case
      when count(*) > 0 then 100.0 * count(*) filter (where liked) / count(*)
      else 0::numeric
    end into pos_prev
  from public.item_feedback fb
  where fb.restaurant_id = p_restaurant_id
    and fb.created_at >= w_prev_start
    and fb.created_at < w_cur_start;

  return jsonb_build_object(
    'today_bookings', coalesce(today_b, 0),
    'yesterday_bookings', coalesce(yday_b, 0),
    'avg_party_last_7d', round(coalesce(avg_curr, 0), 2),
    'avg_party_prior_7d', round(coalesce(avg_prev, 0), 2),
    'covers_last_7d', coalesce(cov_curr, 0),
    'covers_prior_7d', coalesce(cov_prev, 0),
    'sentiment_last_7d', round(coalesce(pos_curr, 0), 1),
    'sentiment_prior_7d', round(coalesce(pos_prev, 0), 1)
  );
end;
$$;

grant execute on function public.get_dashboard_kpis (uuid) to authenticated;
