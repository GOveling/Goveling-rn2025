-- v138 P1: Reviews
create table if not exists public.place_reviews (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  place_id text not null,
  place_name text,
  rating int check (rating between 1 and 5),
  text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_reviews_place on public.place_reviews(place_id);
create index if not exists idx_reviews_user on public.place_reviews(user_id);

-- Documents (encrypted metadata, file in storage)
create table if not exists public.secure_documents (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  storage_path text not null, -- where encrypted blob lives in Supabase storage
  size_bytes int,
  iv text not null,           -- base64 iv
  hmac text not null,         -- base64 hmac
  algo text default 'AES-256-CBC+HMAC-SHA256',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_secure_docs_user on public.secure_documents(user_id);

-- Achievements / Stats (materialized from visits)
create table if not exists public.travel_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  countries_count int default 0,
  cities_count int default 0,
  places_count int default 0,
  last_updated timestamptz default now()
);

-- Simple view for badges (thresholds)
create table if not exists public.travel_badges (
  id bigserial primary key,
  code text unique,
  name text,
  description text,
  threshold int
);
insert into public.travel_badges (code, name, description, threshold)
  values ('globetrotter','Globetrotter','Visita 10 países',10),
         ('cityhopper','City Hopper','Explora 25 ciudades',25),
         ('scout','Scout','Marca 100 lugares',100)
on conflict (code) do nothing;
