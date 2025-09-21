-- v139: Visitas y actualización automática de stats
-- FIXED VERSION: Corrected trigger syntax and added missing travel_stats table

-- First create the travel_stats table if it doesn't exist
create table if not exists public.travel_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  countries_count int default 0,
  cities_count int default 0,
  places_count int default 0,
  last_updated timestamptz default now()
);

-- Enable RLS on travel_stats
alter table public.travel_stats enable row level security;

-- Create policy for travel_stats
drop policy if exists travel_stats_rw on public.travel_stats;
create policy travel_stats_rw on public.travel_stats for all using (auth.uid() = user_id);

-- Create trip_visits table
create table if not exists public.trip_visits (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  trip_id uuid,
  place_id text,
  place_name text,
  lat double precision,
  lng double precision,
  country_code text,
  city text,
  visited_at timestamptz default now()
);
create index if not exists idx_visits_user on public.trip_visits(user_id);
create index if not exists idx_visits_trip on public.trip_visits(trip_id);

-- Enable RLS on trip_visits
alter table public.trip_visits enable row level security;

-- Create policy for trip_visits
drop policy if exists trip_visits_rw on public.trip_visits;
create policy trip_visits_rw on public.trip_visits for all using (auth.uid() = user_id);

-- Create the trigger function that will handle the trigger logic
create or replace function public.handle_visit_stats_update()
returns trigger language plpgsql as $$
declare
  target_user_id uuid;
begin
  -- Determine which user_id to use
  if TG_OP = 'DELETE' then
    target_user_id := old.user_id;
  else
    target_user_id := new.user_id;
  end if;

  -- Update or insert travel stats
  insert into public.travel_stats (user_id, countries_count, cities_count, places_count, last_updated)
  select 
    target_user_id,
    count(distinct nullif(country_code,'')) as countries,
    count(distinct nullif(city,'')) as cities,
    count(*) as places,
    now()
  from public.trip_visits v
  where v.user_id = target_user_id
  on conflict (user_id) do update set
    countries_count = excluded.countries_count,
    cities_count = excluded.cities_count,
    places_count = excluded.places_count,
    last_updated = excluded.last_updated;

  return coalesce(new, old);
end;
$$;

-- Create the trigger
drop trigger if exists trg_visits_stats on public.trip_visits;
create trigger trg_visits_stats
  after insert or delete or update on public.trip_visits
  for each row execute function public.handle_visit_stats_update();
