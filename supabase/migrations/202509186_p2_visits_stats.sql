-- v139: Visitas y actualización automática de stats
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

create or replace function public.recompute_travel_stats(uid uuid)
returns void language plpgsql as $$
begin
  -- countries
  update public.travel_stats ts
  set countries_count = sub.countries,
      cities_count = sub.cities,
      places_count = sub.places,
      last_updated = now()
  from (
    select
      count(distinct nullif(country_code,'')) as countries,
      count(distinct nullif(city,'')) as cities,
      count(*) as places
    from public.trip_visits v
    where v.user_id = uid
  ) sub
  where ts.user_id = uid;

  -- if row missing, insert
  insert into public.travel_stats (user_id, countries_count, cities_count, places_count)
  select uid,
         coalesce((select count(distinct nullif(country_code,'')) from public.trip_visits where user_id=uid),0),
         coalesce((select count(distinct nullif(city,'')) from public.trip_visits where user_id=uid),0),
         coalesce((select count(*) from public.trip_visits where user_id=uid),0)
  on conflict (user_id) do nothing;
end
$$;

drop trigger if exists trg_visits_stats on public.trip_visits;
create trigger trg_visits_stats
after insert or delete or update on public.trip_visits
for each row execute procedure
  public.recompute_travel_stats(coalesce(new.user_id, old.user_id));
