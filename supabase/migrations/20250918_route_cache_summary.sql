-- v134: route_cache.summary (jsonb) to persist per-day metrics/version/timeline info
do $$ begin
  alter table public.route_cache add column if not exists summary jsonb;
exception when duplicate_column then null; end $$;
