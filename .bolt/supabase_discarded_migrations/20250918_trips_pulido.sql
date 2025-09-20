-- v128: accommodations, trip_settings, route_cache
create table if not exists public.accommodations (
  id bigserial primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  checkin_date date,
  checkout_date date,
  created_at timestamptz default now()
);

create table if not exists public.trip_settings (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  location_sharing boolean default false,
  timezone text,
  updated_at timestamptz default now()
);

create table if not exists public.route_cache (
  id bigserial primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  day date not null,
  places jsonb not null, -- ordered array of place_ids or objects
  created_at timestamptz default now()
);
