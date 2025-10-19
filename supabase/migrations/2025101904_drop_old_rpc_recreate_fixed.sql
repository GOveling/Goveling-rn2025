-- Drop the old RPC function (with date parameters) to resolve PGRST203 ambiguity error
-- This migration removes the old version that has parameters: (uuid, text, text, date, date, numeric, text, text)
-- And replaces it with the new version that has: (uuid, text, text, text, text, numeric, text, text)

-- Drop the old function signature if it exists
drop function if exists public.update_trip_details(
  p_trip_id uuid,
  p_title text,
  p_description text,
  p_start_date date,
  p_end_date date,
  p_budget numeric,
  p_accommodation text,
  p_transport text
) cascade;

-- Recreate with new signature (text dates instead of date)
create or replace function public.update_trip_details(
  p_trip_id uuid,
  p_title text,
  p_description text,
  p_start_date text,
  p_end_date text,
  p_budget numeric,
  p_accommodation text,
  p_transport text
)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
  v_trip public.trips;
  v_start_date date;
  v_end_date date;
begin
  -- Parse date parameters (handle null and empty strings)
  v_start_date := case 
    when p_start_date is null or p_start_date = '' then null
    else p_start_date::date
  end;
  
  v_end_date := case 
    when p_end_date is null or p_end_date = '' then null
    else p_end_date::date
  end;

  -- Check permissions: owner (by user_id or owner_id) OR active editor collaborator
  select exists (
    select 1
    from public.trips t
    where t.id = p_trip_id
      and (t.user_id = auth.uid() or t.owner_id = auth.uid())
  )
  or exists (
    select 1
    from public.trip_collaborators tc
    where tc.trip_id = p_trip_id
      and tc.user_id = auth.uid()
      and coalesce(tc.status, 'active') = 'active'
      and coalesce(tc.role, 'viewer') in ('editor')
  ) into v_allowed;

  if not v_allowed then
    raise exception 'not authorized to update this trip' using errcode = '42501';
  end if;

  update public.trips t
  set 
    title = p_title,
    description = p_description,
    start_date = v_start_date,
    end_date = v_end_date,
    budget = p_budget,
    accommodation_preference = p_accommodation,
    transport_preference = p_transport,
    updated_at = now()
  where t.id = p_trip_id
  returning t.* into v_trip;

  return v_trip;
end;
$$;

comment on function public.update_trip_details(uuid, text, text, text, text, numeric, text, text)
is 'SECURITY DEFINER function to update trip details for owners and editors, bypassing RLS safely. Accepts text for dates and parses them safely.';

-- Revoke execute from public and grant to authenticated only
revoke all on function public.update_trip_details(uuid, text, text, text, text, numeric, text, text) from public;
grant execute on function public.update_trip_details(uuid, text, text, text, text, numeric, text, text) to authenticated;
