-- B2B dashboard: menu performance refetch listens to item_feedback changes.
-- Version timestamp matches remote (Supabase MCP apply_migration).

do $do$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'item_feedback'
  ) then
    alter publication supabase_realtime add table public.item_feedback;
  end if;
end
$do$;
