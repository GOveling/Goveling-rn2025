-- Create a secure RPC to accept trip invitations without client inserts
-- This avoids permissive RLS on trip_collaborators and eliminates recursion issues

create or replace function public.accept_invitation_rpc(
  p_invitation_id integer default null,
  p_token text default null
)
returns table (trip_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv record;
  v_email text;
  v_owner uuid;
  v_added_by uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  -- Fetch invitation by id or token
  select * into v_inv
  from public.trip_invitations
  where (p_token is not null and token = p_token)
     or (p_invitation_id is not null and id = p_invitation_id)
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'This invitation has already been %', v_inv.status;
  end if;

  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    update public.trip_invitations
      set status = 'cancelled', updated_at = now()
      where id = v_inv.id;
    raise exception 'This invitation has expired';
  end if;

  -- Ensure the authenticated user's email matches the invitation
  select email into v_email from auth.users where id = v_uid;
  if v_email is null or lower(v_email) <> lower(v_inv.email) then
    raise exception 'This invitation was sent to a different email address';
  end if;

  -- Determine owner and who is adding
  select coalesce(t.owner_id, t.user_id) into v_owner from public.trips t where t.id = v_inv.trip_id;
  v_added_by := coalesce(v_inv.inviter_id, v_owner);

  -- Insert collaborator (idempotent)
  insert into public.trip_collaborators (trip_id, user_id, role, added_by)
  values (v_inv.trip_id, v_uid, v_inv.role, v_added_by)
  on conflict (trip_id, user_id) do nothing;

  -- Mark invitation accepted
  update public.trip_invitations
  set status = 'accepted', accepted_at = now(), accepted_by = v_uid, updated_at = now()
  where id = v_inv.id;

  -- Return trip id
  return query select v_inv.trip_id::uuid as trip_id;
end;
$$;

revoke all on function public.accept_invitation_rpc(integer, text) from public;
grant execute on function public.accept_invitation_rpc(integer, text) to authenticated;
