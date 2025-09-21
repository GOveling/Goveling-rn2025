-- FIXED VERSION: Removed IF NOT EXISTS from CREATE POLICY statements

create table if not exists public.booking_clickouts (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  vertical text check (vertical in ('flights','hotels','esim')) not null,
  url text not null,
  params jsonb,
  created_at timestamptz default now()
);

alter table public.booking_clickouts enable row level security;

-- Drop existing policies first, then create new ones
drop policy if exists booking_clickouts_select on public.booking_clickouts;
drop policy if exists booking_clickouts_insert on public.booking_clickouts;

-- owner can read own; inserts allowed to authenticated
create policy booking_clickouts_select on public.booking_clickouts for select using (auth.uid() = user_id);
create policy booking_clickouts_insert on public.booking_clickouts for insert with check (auth.role() = 'authenticated');
