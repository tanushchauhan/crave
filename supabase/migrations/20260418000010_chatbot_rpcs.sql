-- CRAVE: constrained RPCs for B2B "Ask Crave" tools (docs/plan.md §4.2, docs/supabase.md §8.3–§8.4)

create or replace function public.assert_restaurant_owner (p_restaurant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.restaurants r
    where r.id = p_restaurant_id and r.owner_user_id = auth.uid ()
  ) then
    raise exception 'forbidden';
  end if;
end;
$$;

create or replace function public.get_booking_summary (p_restaurant_id uuid, p_days int default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz := now() - (p_days::text || ' days')::interval;
begin
  perform public.assert_restaurant_owner (p_restaurant_id);

  return (
    select jsonb_build_object(
      'restaurant_id', p_restaurant_id,
      'since', since,
      'total_bookings', count(*),
      'confirmed_bookings', count(*) filter (where status = 'confirmed'),
      'avg_party_size', coalesce(avg(party_size), 0)
    )
    from public.bookings b
    where b.restaurant_id = p_restaurant_id
      and b.created_at >= since
  );
end;
$$;

create or replace function public.get_menu_performance (p_restaurant_id uuid, p_days int default 7, p_item_substr text default null)
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
      select jsonb_agg(
        jsonb_build_object(
          'menu_item_id', mi.id,
          'name', mi.name,
          'views', coalesce(v.cnt, 0),
          'thumbs_up', coalesce(f.up_cnt, 0),
          'thumbs_down', coalesce(f.down_cnt, 0)
        )
        order by mi.name
      )
      from public.menu_items mi
      left join lateral (
        select count(*)::bigint as cnt
        from public.menu_interactions mi2
        where mi2.menu_item_id = mi.id and mi2.created_at >= since
      ) v on true
      left join lateral (
        select
          count(*) filter (where liked)::bigint as up_cnt,
          count(*) filter (where not liked)::bigint as down_cnt
        from public.item_feedback fb
        where fb.menu_item_id = mi.id and fb.created_at >= since
      ) f on true
      where mi.restaurant_id = p_restaurant_id
        and (
          p_item_substr is null
          or mi.name ilike '%' || p_item_substr || '%'
        )
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_item_feedback (p_restaurant_id uuid, p_days int default 7, p_liked boolean default null)
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
      select jsonb_agg(s.obj order by s.created_at desc)
      from (
        select jsonb_build_object(
          'id', fb.id,
          'liked', fb.liked,
          'menu_item_id', fb.menu_item_id,
          'raw_item_text', fb.raw_item_text,
          'created_at', fb.created_at
        ) as obj,
        fb.created_at
        from public.item_feedback fb
        where fb.restaurant_id = p_restaurant_id
          and fb.created_at >= since
          and (p_liked is null or fb.liked = p_liked)
        order by fb.created_at desc
        limit 500
      ) s
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_customer_segments (p_restaurant_id uuid, p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz := now() - (p_days::text || ' days')::interval;
begin
  perform public.assert_restaurant_owner (p_restaurant_id);

  return (
    select jsonb_agg(
      jsonb_build_object(
        'context_tag', s.context_tag,
        'bookings', s.bookings,
        'avg_party', s.avg_party
      )
      order by s.bookings desc
    )
    from (
      select coalesce(b.context_tag, 'unknown') as context_tag, count(*)::bigint as bookings, avg(b.party_size)::numeric as avg_party
      from public.bookings b
      where b.restaurant_id = p_restaurant_id
        and b.created_at >= since
      group by 1
    ) s
  );
end;
$$;

create or replace function public.get_competitive_view_graph (p_restaurant_id uuid, p_days int default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz := now() - (p_days::text || ' days')::interval;
begin
  perform public.assert_restaurant_owner (p_restaurant_id);

  return (
    select jsonb_build_object(
      'also_viewed',
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'restaurant_id', x.other_id,
            'sessions', x.cnt
          )
          order by x.cnt desc
        ),
        '[]'::jsonb
      )
    )
    from (
      select i2.restaurant_id as other_id, count(*)::bigint as cnt
      from public.impressions i1
      join public.impressions i2
        on i2.user_id = i1.user_id
        and i2.created_at >= since
        and i2.restaurant_id <> i1.restaurant_id
      where i1.restaurant_id = p_restaurant_id
        and i1.created_at >= since
      group by 1
      order by cnt desc
      limit 25
    ) x
  );
end;
$$;

create or replace function public.get_campaign_performance (p_restaurant_id uuid, p_campaign_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_restaurant_owner (p_restaurant_id);

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'campaign_id', c.id,
          'prompt', c.prompt,
          'status', c.status,
          'assets',
          (
            select coalesce(
              jsonb_agg(
                jsonb_build_object(
                  'asset_id', a.id,
                  'type', a.type,
                  's3_url', a.s3_url
                )
                order by a.created_at desc
              ),
              '[]'::jsonb
            )
            from public.ad_assets a
            where a.campaign_id = c.id
          )
        )
        order by c.created_at desc
      )
      from public.ad_campaigns c
      where c.restaurant_id = p_restaurant_id
        and (p_campaign_id is null or c.id = p_campaign_id)
      limit 50
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.get_booking_summary (uuid, int) to authenticated;
grant execute on function public.get_menu_performance (uuid, int, text) to authenticated;
grant execute on function public.get_item_feedback (uuid, int, boolean) to authenticated;
grant execute on function public.get_customer_segments (uuid, int) to authenticated;
grant execute on function public.get_competitive_view_graph (uuid, int) to authenticated;
grant execute on function public.get_campaign_performance (uuid, uuid) to authenticated;
