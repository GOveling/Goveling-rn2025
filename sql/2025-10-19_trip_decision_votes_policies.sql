-- Ensure unique vote per user per decision
create unique index if not exists uniq_trip_decision_votes_decision_user
  on public.trip_decision_votes(decision_id, user_id);

-- Helpful indexes
create index if not exists idx_trip_decision_votes_decision on public.trip_decision_votes(decision_id);
create index if not exists idx_trip_decision_votes_user on public.trip_decision_votes(user_id);

alter table public.trip_decision_votes enable row level security;

-- Membership predicate: user is owner or collaborator of the trip for this decision
-- and the decision is active and not expired
-- Also enforces selected_participants if provided

drop policy if exists trip_decision_votes_select on public.trip_decision_votes;
create policy trip_decision_votes_select on public.trip_decision_votes
for select using (
  exists (
    select 1
    from public.trip_decisions d
    join public.trips t on t.id = d.trip_id
    left join public.trip_collaborators c
      on c.trip_id = d.trip_id and c.user_id = auth.uid()
    where d.id = decision_id
      and (t.owner_id = auth.uid() or c.user_id is not null)
  )
);

drop policy if exists trip_decision_votes_insert on public.trip_decision_votes;
create policy trip_decision_votes_insert on public.trip_decision_votes
for insert with check (
  exists (
    select 1
    from public.trip_decisions d
    join public.trips t on t.id = d.trip_id
    left join public.trip_collaborators c
      on c.trip_id = d.trip_id and c.user_id = auth.uid()
    where d.id = decision_id
      and (t.owner_id = auth.uid() or c.user_id is not null)
      and (d.status = 'active')
      and (d.end_date is null or d.end_date > now())
      and (
        case
          when jsonb_typeof(to_jsonb(d.selected_participants)) = 'array' then
            (
              jsonb_array_length(to_jsonb(d.selected_participants)) = 0 or
              to_jsonb(d.selected_participants) ? (auth.uid()::text)
            )
          else true
        end
      )
  )
);

drop policy if exists trip_decision_votes_update on public.trip_decision_votes;
create policy trip_decision_votes_update on public.trip_decision_votes
for update using (
  user_id = auth.uid() and exists (
    select 1
    from public.trip_decisions d
    join public.trips t on t.id = d.trip_id
    left join public.trip_collaborators c
      on c.trip_id = d.trip_id and c.user_id = auth.uid()
    where d.id = decision_id
      and (t.owner_id = auth.uid() or c.user_id is not null)
  )
) with check (
  exists (
    select 1
    from public.trip_decisions d
    where d.id = decision_id
      and (d.status = 'active')
      and (d.end_date is null or d.end_date > now())
      and (
        case
          when jsonb_typeof(to_jsonb(d.selected_participants)) = 'array' then
            (
              jsonb_array_length(to_jsonb(d.selected_participants)) = 0 or
              to_jsonb(d.selected_participants) ? (auth.uid()::text)
            )
          else true
        end
      )
  )
);

drop policy if exists trip_decision_votes_delete on public.trip_decision_votes;
create policy trip_decision_votes_delete on public.trip_decision_votes
for delete using (
  -- Voter can delete their own vote or trip owner can manage
  user_id = auth.uid() or exists (
    select 1 from public.trip_decisions d
    join public.trips t on t.id = d.trip_id
    where d.id = decision_id and t.owner_id = auth.uid()
  )
);
