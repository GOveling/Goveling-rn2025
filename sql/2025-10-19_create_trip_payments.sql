-- Create trip_payments table to persist liquidation payments
create table if not exists public.trip_payments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  expense_id uuid null references public.trip_expenses(id) on delete set null,
  from_user_id uuid not null references public.profiles(id) on delete restrict,
  to_user_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_trip_payments_trip on public.trip_payments(trip_id);
create index if not exists idx_trip_payments_expense on public.trip_payments(expense_id);
create index if not exists idx_trip_payments_from on public.trip_payments(from_user_id);
create index if not exists idx_trip_payments_to on public.trip_payments(to_user_id);

alter table public.trip_payments enable row level security;

-- Helper policy predicate: user is trip owner or collaborator of the trip
-- Adjust table/column names if your collaborators table differs
drop policy if exists trip_payments_select on public.trip_payments;
create policy trip_payments_select on public.trip_payments
for select
using (
  exists (
    select 1 from public.trips t
    where t.id = trip_id and (t.owner_id = auth.uid() or
      exists (
        select 1 from public.trip_collaborators c
        where c.trip_id = trip_id and c.user_id = auth.uid()
      )
    )
  )
);

drop policy if exists trip_payments_insert on public.trip_payments;
create policy trip_payments_insert on public.trip_payments
for insert
with check (
  exists (
    select 1 from public.trips t
    where t.id = trip_id and (t.owner_id = auth.uid() or
      exists (
        select 1 from public.trip_collaborators c
        where c.trip_id = trip_id and c.user_id = auth.uid()
      )
    )
  )
);

drop policy if exists trip_payments_delete on public.trip_payments;
create policy trip_payments_delete on public.trip_payments
for delete
using (
  -- Only creator or trip owner can delete
  created_by = auth.uid() or exists (
    select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()
  )
);
