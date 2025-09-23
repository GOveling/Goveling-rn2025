-- Search logs table for places search metrics
create table if not exists public.search_logs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null,
  query text not null,
  categories text[] null,
  locale text null,
  took_ms integer null,
  results_count integer null,
  used_location boolean default false,
  source text null,
  fallback_used boolean default false,
  error text null,
  user_lat double precision null,
  user_lng double precision null
);

create index if not exists search_logs_created_at_idx on public.search_logs(created_at desc);
create index if not exists search_logs_query_idx on public.search_logs using gin (query gin_trgm_ops);

-- Enable pg_trgm if not enabled (safe guard)
create extension if not exists pg_trgm;
