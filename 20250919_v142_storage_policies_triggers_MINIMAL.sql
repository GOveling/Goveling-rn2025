-- FIXED VERSION: Skip storage policies (require superuser), focus on triggers only
-- Storage policies can be configured via Supabase Dashboard if needed

-- Triggers to write to notifications_inbox on key events

-- On trip_invitations insert -> notify owner
create or replace function public.on_trip_invitation_insert_notify()
returns trigger language plpgsql as $$
declare
  owner uuid;
begin
  owner := NEW.owner_id;
  insert into public.notifications_inbox(user_id, title, body, data)
  values (owner, 'Invitación enviada', 'Se envió una invitación a '||NEW.email||' como '||NEW.role, jsonb_build_object('trip_id', NEW.trip_id, 'email', NEW.email, 'role', NEW.role));
  return NEW;
end;
$$;

drop trigger if exists trg_trip_invitation_insert_notify on public.trip_invitations;
create trigger trg_trip_invitation_insert_notify
after insert on public.trip_invitations
for each row execute function public.on_trip_invitation_insert_notify();

-- On trip_collaborators insert -> notify owner and collaborator
create or replace function public.on_trip_collaborator_insert_notify()
returns trigger language plpgsql as $$
declare
  t_owner uuid;
begin
  select user_id into t_owner from public.trips where id = NEW.trip_id;
  insert into public.notifications_inbox(user_id, title, body, data)
  values (t_owner, 'Nuevo colaborador', 'Un usuario se unió a tu trip como '||NEW.role, jsonb_build_object('trip_id', NEW.trip_id, 'user_id', NEW.user_id, 'role', NEW.role));
  insert into public.notifications_inbox(user_id, title, body, data)
  values (NEW.user_id, 'Te agregaron a un trip', 'Fuiste agregado como '||NEW.role, jsonb_build_object('trip_id', NEW.trip_id, 'role', NEW.role));
  return NEW;
end;
$$;

drop trigger if exists trg_trip_collab_insert_notify on public.trip_collaborators;
create trigger trg_trip_collab_insert_notify
after insert on public.trip_collaborators
for each row execute function public.on_trip_collaborator_insert_notify();

-- On trip_visits insert -> notify owner + collaborators
create or replace function public.on_trip_visit_insert_notify()
returns trigger language plpgsql as $$
declare
  t_owner uuid;
  rec record;
begin
  select user_id into t_owner from public.trips where id = NEW.trip_id;
  insert into public.notifications_inbox(user_id, title, body, data)
  values (t_owner, 'Lugar visitado', 'Se marcó un lugar como visitado en tu trip.', jsonb_build_object('trip_id', NEW.trip_id, 'place_id', NEW.place_id));
  for rec in select user_id from public.trip_collaborators where trip_id = NEW.trip_id loop
    insert into public.notifications_inbox(user_id, title, body, data)
    values (rec.user_id, 'Lugar visitado', 'Un lugar del trip fue marcado como visitado.', jsonb_build_object('trip_id', NEW.trip_id, 'place_id', NEW.place_id));
  end loop;
  return NEW;
end;
$$;

drop trigger if exists trg_trip_visit_insert_notify on public.trip_visits;
create trigger trg_trip_visit_insert_notify
after insert on public.trip_visits
for each row execute function public.on_trip_visit_insert_notify();

-- Note: Storage policies for avatars/docs can be configured manually via Supabase Dashboard:
-- 1. Go to Storage > Policies
-- 2. Create policies for 'public' bucket: avatars/{auth.uid()}/*
-- 3. Create policies for 'private' bucket: docs/{auth.uid()}/*
