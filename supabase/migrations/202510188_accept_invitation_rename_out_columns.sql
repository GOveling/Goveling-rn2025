-- Rename OUT columns in accept_invitation to avoid PL/pgSQL name ambiguity
-- Ambiguity occurred with ON CONFLICT (trip_id, user_id) when OUT param was named trip_id

DROP FUNCTION IF EXISTS public.accept_invitation(bigint);
CREATE FUNCTION public.accept_invitation(invitation_id bigint)
RETURNS TABLE (result_trip_id uuid, result_trip_title text, result_role text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_inv record;
  v_uid uuid;
  v_inviter_name text;
  v_trip_id uuid;
  v_trip_title text;
  v_role text;
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

  -- Values to return
  v_trip_id := v_inv.trip_id;
  v_trip_title := v_inv.trip_title;
  v_role := v_inv.role;

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

  -- Return using names distinct from table columns to avoid ambiguity
  RETURN QUERY SELECT v_trip_id, v_trip_title, v_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(bigint) TO authenticated;
