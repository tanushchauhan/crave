-- Safe upgrade if an older revision created pref_update_source with 'swipe' instead of 'onboarding' (docs/supabase.md §5 migration 12).
do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'pref_update_source'
      and e.enumlabel = 'swipe'
  ) then
    alter type public.pref_update_source rename value 'swipe' to 'onboarding';
  end if;
end
$$;
