-- B2B Live Menu Management: optional JSON metadata + Realtime for menu_items.
-- Version timestamp matches remote (Supabase MCP apply_migration).

set search_path = public;

alter table public.menu_items
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.menu_items.metadata is
  'Optional partner fields (category, dietary, calories as strings).';

do $do$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'menu_items'
  ) then
    alter publication supabase_realtime add table public.menu_items;
  end if;
end
$do$;
