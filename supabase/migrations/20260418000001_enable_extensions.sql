-- CRAVE: extensions per docs/supabase.md §5.1, §6.1
-- PostGIS: if this fails on a restricted tier, replace geography with lat/lon doubles (see docs/supabase.md §5.1).

create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm;

-- PostGIS powers geography(Point,4326) on restaurants/users.
create extension if not exists postgis;
