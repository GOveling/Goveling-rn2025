
-- Consolidated base (Trips/Places/Collaborators/Invitations) + RLS/policies + Push tables + Buckets
-- Safe to run multiple times; uses IF NOT EXISTS where possible

create extension if not exists pgcrypto;

-- A) BASE TABLES
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  timezone text default 'UTC',
  created_at timestamptz default now()
);

create table if not exists public.trip_places (
  id bigserial primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  place_id text not null,
  name text,
  lat double precision,
  lng double precision,
  category text,
  created_at timestamptz default now()
);
create index if not exists idx_trip_places_trip on public.trip_places(trip_id);

create table if not exists public.trip_collaborators (
  id bigserial primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('viewer','editor')) not null,
  added_at timestamptz default now(),
  unique (trip_id, user_id)
);
create index if not exists idx_trip_collab_trip on public.trip_collaborators(trip_id);
create index if not exists idx_trip_collab_user on public.trip_collaborators(user_id);

create table if not exists public.trip_invitations (
  id bigserial primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  email text not null,
  role text check (role in ('viewer','editor')) not null,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
create index if not exists idx_trip_inv_trip on public.trip_invitations(trip_id);
create index if not exists idx_trip_inv_email on public.trip_invitations(email);

-- D) PUSH TABLES (device tokens + inbox)
create table if not exists public.device_tokens (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  platform text check (platform in ('ios','android','web')),
  token text not null,
  created_at timestamptz default now(),
  unique (user_id, token)
);

create table if not exists public.notifications_inbox (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Optional routes cache (if used)
create table if not exists public.directions_cache (
  id bigserial primary key,
  origin_lat double precision,
  origin_lng double precision,
  dest_lat double precision,
  dest_lng double precision,
  mode text check (mode in ('walking','driving','transit','bicycling')) default 'walking',
  polyline text,
  distance_m int,
  duration_s int,
  created_at timestamptz default now()
);
create index if not exists idx_dir_cache on public.directions_cache(origin_lat, origin_lng, dest_lat, dest_lng, mode);

-- B) RLS + POLICIES
alter table public.trips enable row level security;
alter table public.trip_places enable row level security;
alter table public.trip_collaborators enable row level security;
alter table public.trip_invitations enable row level security;
alter table public.device_tokens enable row level security;
alter table public.notifications_inbox enable row level security;
alter table public.directions_cache enable row level security;

-- trips
create policy if not exists trips_select on public.trips for select
using (
  auth.uid() = user_id
  or exists (select 1 from public.trip_collaborators c where c.trip_id = trips.id and c.user_id = auth.uid())
);
create policy if not exists trips_modify on public.trips for all using (auth.uid() = user_id);

-- trip_places
create policy if not exists trip_places_rw on public.trip_places for all
using (
  exists (
    select 1 from public.trips t
    where t.id = trip_places.trip_id
      and (
        t.user_id = auth.uid()
        or exists (select 1 from public.trip_collaborators c where c.trip_id = t.id and c.user_id = auth.uid())
      )
  )
);

-- trip_collaborators (solo owner modifica)
create policy if not exists trip_collab_owner_rw on public.trip_collaborators for all
using (exists (select 1 from public.trips t where t.id = trip_collaborators.trip_id and t.user_id = auth.uid()));

-- trip_invitations (owner RW; invitado puede leer por email)
create policy if not exists trip_inv_owner_rw on public.trip_invitations for all using (owner_id = auth.uid());
create policy if not exists trip_inv_by_email_select on public.trip_invitations for select using (email = auth.email());

-- device_tokens
create policy if not exists dt_rw on public.device_tokens for all using (auth.uid() = user_id);

-- notifications_inbox
create policy if not exists ni_rw on public.notifications_inbox for all using (auth.uid() = user_id);

-- directions_cache: lectura pública; escrituras por service role
create policy if not exists directions_cache_select on public.directions_cache for select using (true);

-- C) BUCKETS
-- Nota: si ya existen, esto no falla
select storage.create_bucket('public', public := true);
select storage.create_bucket('private', public := false);

-- Ajustar policies de storage.objects si se usan rutas como avatars/{auth.uid()}/* y docs/{auth.uid()}/*
-- Ejemplo (puedes habilitar si aplican tus paths):
--
-- begin;
-- alter table storage.objects enable row level security;
-- create policy if not exists "Public read for public bucket" on storage.objects
--   for select using (bucket_id = 'public');
-- create policy if not exists "Users can upload avatars to own folder" on storage.objects
--   for insert with check (bucket_id = 'public' and (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text);
-- create policy if not exists "User read private docs" on storage.objects
--   for select using (bucket_id = 'private' and (storage.foldername(name))[1] = 'docs' and (storage.foldername(name))[2] = auth.uid()::text);
-- create policy if not exists "User write private docs" on storage.objects
--   for insert with check (bucket_id = 'private' and (storage.foldername(name))[1] = 'docs' and (storage.foldername(name))[2] = auth.uid()::text);
-- commit;
