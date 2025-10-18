-- ================================================================
-- MIGRATION: Enrich notifications + RPCs for accept/reject by ID
-- Date: 2025-10-17
-- Description:
--  - Include trip title and inviter name in notifications data
--  - Provide accept_invitation(invitation_id) and reject_invitation(invitation_id)
--    RPCs to allow invited users to accept/decline despite RLS
-- ================================================================

-- SAFETY: Ensure pgcrypto available (for gen_random_uuid etc.)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- 1) Update invitation insert notify trigger to include details
-- ================================================================
CREATE OR REPLACE FUNCTION public.on_trip_invitation_insert_notify()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  trip_title text;
  inviter_name text;
BEGIN
  -- Fetch trip title and inviter display name
  SELECT t.title INTO trip_title FROM public.trips t WHERE t.id = NEW.trip_id;
  SELECT COALESCE(p.full_name, p.email, 'Goveling user') INTO inviter_name
  FROM public.profiles p WHERE p.id = NEW.inviter_id;

  INSERT INTO public.notifications_inbox(user_id, title, body, data)
  VALUES (
    NEW.inviter_id,
    'Invitación enviada',
    'Se envió una invitación a '||NEW.email||' como '||NEW.role||
      CASE WHEN trip_title IS NOT NULL THEN ' para "'||trip_title||'"' ELSE '' END,
    jsonb_build_object(
      'type','invite_sent',
      'trip_id', NEW.trip_id,
      'trip_name', trip_title,
      'invited_email', NEW.email,
      'role', NEW.role,
      'inviter_id', NEW.inviter_id,
      'inviter_name', inviter_name
    )
  );
  RETURN NEW;
END;
$$;

-- Recreate trigger to ensure it uses the latest function body
DROP TRIGGER IF EXISTS trg_trip_invitation_insert_notify ON public.trip_invitations;
CREATE TRIGGER trg_trip_invitation_insert_notify
AFTER INSERT ON public.trip_invitations
FOR EACH ROW EXECUTE FUNCTION public.on_trip_invitation_insert_notify();

-- ================================================================
-- 2) Update collaborators insert notify trigger to include details
-- ================================================================
CREATE OR REPLACE FUNCTION public.on_trip_collaborator_insert_notify()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  t_owner uuid;
  trip_title text;
  inviter_name text;
  added_user_name text;
BEGIN
  SELECT user_id INTO t_owner FROM public.trips WHERE id = NEW.trip_id;
  SELECT title INTO trip_title FROM public.trips WHERE id = NEW.trip_id;
  SELECT COALESCE(p.full_name, p.email, 'Goveling user')
    INTO inviter_name FROM public.profiles p WHERE p.id = NEW.added_by;
  SELECT COALESCE(p2.full_name, p2.email, 'User')
    INTO added_user_name FROM public.profiles p2 WHERE p2.id = NEW.user_id;

  -- Notify owner (if exists) about added member
  IF t_owner IS NOT NULL THEN
    INSERT INTO public.notifications_inbox(user_id, title, body, data)
    VALUES (
      t_owner,
      'Team member added',
      (added_user_name || ' se unió como ' || NEW.role ||
        CASE WHEN trip_title IS NOT NULL THEN ' a "'||trip_title||'"' ELSE '' END),
      jsonb_build_object(
        'type','trip_member_added',
        'trip_id', NEW.trip_id,
        'trip_name', trip_title,
        'added_user', added_user_name,
        'role', NEW.role,
        'inviter_id', NEW.added_by,
        'inviter_name', inviter_name
      )
    );
  END IF;

  -- Notify the collaborator who was added
  INSERT INTO public.notifications_inbox(user_id, title, body, data)
  VALUES (
    NEW.user_id,
    CASE WHEN inviter_name IS NOT NULL AND trip_title IS NOT NULL THEN
      inviter_name || ' te ha agregado al trip ' || '"' || trip_title || '"'
    ELSE 'Te agregaron a un viaje' END,
    'Fuiste agregado como ' || NEW.role,
    jsonb_build_object(
      'type','added_to_trip',
      'trip_id', NEW.trip_id,
      'trip_name', trip_title,
      'role', NEW.role,
      'inviter_id', NEW.added_by,
      'inviter_name', inviter_name
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_collab_insert_notify ON public.trip_collaborators;
CREATE TRIGGER trg_trip_collab_insert_notify
AFTER INSERT ON public.trip_collaborators
FOR EACH ROW EXECUTE FUNCTION public.on_trip_collaborator_insert_notify();

-- ================================================================
-- 3) RPCs: accept_invitation/reject_invitation by ID (SECURITY DEFINER)
-- ================================================================
DROP FUNCTION IF EXISTS public.accept_invitation(bigint);
CREATE FUNCTION public.accept_invitation(invitation_id bigint)
RETURNS TABLE (trip_id uuid, trip_title text, role text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_inv record;
  v_trip_title text;
  v_uid uuid;
  v_inviter_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  v_uid := auth.uid();

  SELECT ti.*, t.title AS trip_title INTO v_inv
  FROM public.trip_invitations ti
  JOIN public.trips t ON t.id = ti.trip_id
  WHERE ti.id = invitation_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired invitation'; END IF;
  IF v_inv.status <> 'pending' THEN RAISE EXCEPTION 'This invitation has already been %', v_inv.status; END IF;
  IF v_inv.expires_at <= now() THEN RAISE EXCEPTION 'This invitation has expired'; END IF;

  -- Email match (best effort)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_uid AND lower(trim(p.email)) = lower(trim(v_inv.email))
  ) THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address';
  END IF;

  -- Add collaborator (idempotent via unique constraint)
  INSERT INTO public.trip_collaborators (trip_id, user_id, role, added_by, added_at)
  VALUES (v_inv.trip_id, v_uid, v_inv.role, v_inv.inviter_id, now())
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Mark accepted
  UPDATE public.trip_invitations
  SET status = 'accepted', accepted_by = v_uid, accepted_at = now(), updated_at = now()
  WHERE id = v_inv.id;

  -- Notify inviter
  SELECT COALESCE(p.full_name, p.email, 'Goveling user') INTO v_inviter_name
  FROM public.profiles p WHERE p.id = v_inv.inviter_id;

  IF v_inv.inviter_id IS NOT NULL THEN
    INSERT INTO public.notifications_inbox(user_id, title, body, data)
    VALUES (
      v_inv.inviter_id,
      'Invitation accepted',
      CASE WHEN v_inv.trip_title IS NOT NULL THEN 'Your invitation for "'||v_inv.trip_title||'" was accepted' ELSE 'Invitation accepted' END,
      jsonb_build_object('type','invite_accepted','trip_id', v_inv.trip_id, 'trip_name', v_inv.trip_title)
    );
  END IF;

  RETURN QUERY SELECT v_inv.trip_id, v_inv.trip_title, v_inv.role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(bigint) TO authenticated;

DROP FUNCTION IF EXISTS public.reject_invitation(bigint);
CREATE FUNCTION public.reject_invitation(invitation_id bigint)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_inv record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT ti.*, t.title AS trip_title INTO v_inv
  FROM public.trip_invitations ti
  JOIN public.trips t ON t.id = ti.trip_id
  WHERE ti.id = invitation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid invitation'; END IF;
  IF v_inv.status <> 'pending' THEN RAISE EXCEPTION 'This invitation has already been %', v_inv.status; END IF;

  UPDATE public.trip_invitations
  SET status = 'declined', updated_at = now()
  WHERE id = v_inv.id;

  IF v_inv.inviter_id IS NOT NULL THEN
    INSERT INTO public.notifications_inbox(user_id, title, body, data)
    VALUES (
      v_inv.inviter_id,
      'Invitation declined',
      CASE WHEN v_inv.trip_title IS NOT NULL THEN 'Your invitation for "'||v_inv.trip_title||'" was declined' ELSE 'Invitation declined' END,
      jsonb_build_object('type','invite_declined','trip_id', v_inv.trip_id, 'trip_name', v_inv.trip_title)
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_invitation(bigint) TO authenticated;

-- ================================================================
-- MIGRATION END
-- ================================================================
