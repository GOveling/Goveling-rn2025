-- Enable RLS for trip_visits table (if not already enabled)
alter table public.trip_visits enable row level security;

-- Drop existing policies if they exist (to make migration idempotent)
drop policy if exists "Users can insert their own visits" on public.trip_visits;
drop policy if exists "Users can view their own visits" on public.trip_visits;
drop policy if exists "Users can update their own visits" on public.trip_visits;
drop policy if exists "Users can delete their own visits" on public.trip_visits;

-- Policy: Users can insert their own visits
create policy "Users can insert their own visits"
on public.trip_visits
for insert
to authenticated
with check (auth.uid() = user_id);

-- Policy: Users can view their own visits
create policy "Users can view their own visits"
on public.trip_visits
for select
to authenticated
using (auth.uid() = user_id);

-- Policy: Users can update their own visits
create policy "Users can update their own visits"
on public.trip_visits
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Policy: Users can delete their own visits
create policy "Users can delete their own visits"
on public.trip_visits
for delete
to authenticated
using (auth.uid() = user_id);
