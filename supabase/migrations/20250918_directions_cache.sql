-- v129: directions_cache (caché por origen, destino, modo)
create table if not exists public.directions_cache (
  id bigserial primary key,
  o_lat double precision not null,
  o_lng double precision not null,
  d_lat double precision not null,
  d_lng double precision not null,
  mode text not null check (mode in ('walking','driving','bicycling','transit')),
  payload jsonb not null, -- raw response simplified for client
  created_at timestamptz default now()
);

create index if not exists idx_dircache_key on public.directions_cache (mode, o_lat, o_lng, d_lat, d_lng);
