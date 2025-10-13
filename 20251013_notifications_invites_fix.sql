-- Goveling - Consolidated migration to fix invitations accept/reject and inbox jsonb writes
-- Safe to run multiple times (uses IF NOT EXISTS / CREATE OR REPLACE)

begin;

-- 1) Ensure useful columns exist
alter table if exists public.trip_invitations
  add column if not exists status text check (status in ('pending','accepted','declined')) default 'pending',
  add column if not exists expires_at timestamptz;

-- Optional QoL for inbox handling in the app
alter table if exists public.notifications_inbox
  add column if not exists viewed_at timestamptz,
  add column if not exists is_read boolean;

-- 2) Recreate trigger function for owner notification on invite (jsonb payload)
create or replace function public.on_trip_invitation_insert_notify()
returns trigger language plpgsql as $$
begin
  insert into public.notifications_inbox(user_id, title, body, data)
  values (
    NEW.owner_id,
    'Invitación enviada',
    'Se envió una invitación a '||NEW.email||' como '||NEW.role,
    jsonb_build_object(
      'trip_id', NEW.trip_id,
      'email', NEW.email,
      'role', NEW.role
    )
  );
  return NEW;
end;
$$;

drop trigger if exists trg_trip_invitation_insert_notify on public.trip_invitations;
create trigger trg_trip_invitation_insert_notify
after insert on public.trip_invitations
for each row execute function public.on_trip_invitation_insert_notify();

-- 3) RPCs: accept/reject without touching inbox (push/inbox handled elsewhere)
create or replace function public.accept_invitation(invitation_id bigint)
returns void
language plpgsql
security definer
as $$
declare
  inv record;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select i.trip_id, i.email, i.role, i.owner_id
    into inv
  from public.trip_invitations i
  where i.id = invitation_id;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if inv.email <> auth.email() then
    raise exception 'You cannot accept this invitation';
  end if;

  insert into public.trip_collaborators(trip_id, user_id, role)
  values (inv.trip_id, uid, inv.role)
  on conflict (trip_id, user_id) do nothing;

  delete from public.trip_invitations where id = invitation_id;
end;
$$;

grant execute on function public.accept_invitation(bigint) to authenticated;

create or replace function public.reject_invitation(invitation_id bigint)
returns void
language plpgsql
security definer
as $$
declare
  inv record;
begin
  select i.trip_id, i.email, i.role, i.owner_id
    into inv
  from public.trip_invitations i
  where i.id = invitation_id;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if inv.email <> auth.email() then
    raise exception 'You cannot reject this invitation';
  end if;

  delete from public.trip_invitations where id = invitation_id;
end;
$$;

grant execute on function public.reject_invitation(bigint) to authenticated;

-- 4) RLS policy safety (drop/create to avoid unsupported IF NOT EXISTS on CREATE POLICY)
drop policy if exists ni_rw on public.notifications_inbox;
create policy ni_rw on public.notifications_inbox for all using (auth.uid() = user_id);

drop policy if exists trip_inv_owner_rw on public.trip_invitations;
create policy trip_inv_owner_rw on public.trip_invitations for all using (owner_id = auth.uid());

drop policy if exists trip_inv_by_email_select on public.trip_invitations;
create policy trip_inv_by_email_select on public.trip_invitations for select using (email = auth.email());

-- 5) Ensure realtime publication has these tables (ignore errors if already added)
DO $$
BEGIN
  BEGIN
    EXECUTE 'alter publication supabase_realtime add table public.trip_invitations';
  EXCEPTION WHEN others THEN
    -- ignore
  END;
  BEGIN
    EXECUTE 'alter publication supabase_realtime add table public.notifications_inbox';
  EXCEPTION WHEN others THEN
    -- ignore
  END;
  BEGIN
    EXECUTE 'alter publication supabase_realtime add table public.trip_collaborators';
  EXCEPTION WHEN others THEN
    -- ignore
  END;
END$$;

-- 6) Reload PostgREST schema cache
notify pgrst, 'reload schema';

commit;
