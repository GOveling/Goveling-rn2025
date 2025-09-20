-- v131: Registro de visitas y helpers
create table if not exists public.trip_place_visits (
  id bigserial primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  place_id text not null, -- id del lugar (o trip_places.id si prefieres)
  visited_at timestamptz default now(),
  lat double precision,
  lng double precision,
  source text default 'travel_mode' -- travel_mode | manual | other
);

create index if not exists idx_visits_trip on public.trip_place_visits(trip_id);
create index if not exists idx_visits_place on public.trip_place_visits(place_id);

-- Opcional: vista de "pendientes" por día: se resolverá en cliente usando route_cache - visitas
