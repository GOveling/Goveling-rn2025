-- RPC: get_trip_with_team
-- Usage: select * from get_trip_with_team('<trip_uuid>');
-- Returns: trip_id, owner_id, title, start_date, end_date, status, collaborators (jsonb array), owner_profile (jsonb), collaborators_count
-- NOTE: Requires appropriate SECURITY DEFINER if RLS blocks reads; adjust as needed.

create or replace function public.get_trip_with_team(p_trip_id uuid)
returns table (
  trip_id uuid,
  owner_id uuid,
  title text,
  start_date date,
  end_date date,
  status text,
  owner_profile jsonb,
  collaborators jsonb,
  collaborators_count integer
) language plpgsql stable as $$
begin
  return query
  with t as (
    select tr.id, coalesce(tr.owner_id, tr.user_id) as owner_id, tr.title, tr.start_date, tr.end_date, tr.status
    from trips tr
    where tr.id = p_trip_id
  ), owner_prof as (
    select p.id, p.full_name, p.avatar_url, p.email
    from profiles p
    join t on t.owner_id = p.id
  ), collabs as (
    select tc.user_id, tc.role, p.full_name, p.avatar_url, p.email
    from trip_collaborators tc
    left join profiles p on p.id = tc.user_id
    where tc.trip_id = p_trip_id
  )
  select
    t.id as trip_id,
    t.owner_id,
    t.title,
    t.start_date,
    t.end_date,
    t.status,
    (select to_jsonb(owner_prof.*) from owner_prof) as owner_profile,
    coalesce(jsonb_agg(to_jsonb(collabs.*)) filter (where collabs.user_id is not null), '[]'::jsonb) as collaborators,
    (select count(*) from collabs) + 1 as collaborators_count -- +1 owner
  from t
  left join collabs on true
  group by t.id, t.owner_id, t.title, t.start_date, t.end_date, t.status;
end; $$;
