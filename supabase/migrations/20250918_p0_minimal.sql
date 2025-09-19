-- v137 P0: minimal auth/profile/prefs
do $$ begin
  alter table if exists public.profiles add column if not exists full_name text;
  alter table if exists public.profiles add column if not exists country_code text;
  alter table if exists public.profiles add column if not exists phone text;
  alter table if exists public.profiles add column if not exists avatar_url text;
  alter table if exists public.profiles add column if not exists temp_avatar_upload_id text;
  alter table if exists public.profiles add column if not exists notif_push boolean default true;
  alter table if exists public.profiles add column if not exists notif_email boolean default true;
  alter table if exists public.profiles add column if not exists temperature_unit text default 'C'; -- 'C' | 'F'
exception when undefined_table then
  create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    country_code text,
    phone text,
    avatar_url text,
    temp_avatar_upload_id text,
    notif_push boolean default true,
    notif_email boolean default true,
    temperature_unit text default 'C',
    updated_at timestamptz default now()
  );
end $$;
