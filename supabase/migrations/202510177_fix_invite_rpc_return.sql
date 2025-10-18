-- FIX: invite_to_trip_rpc return type mismatch causing UUID cast error
-- Issue: "invalid input syntax for type uuid: '16'" when RETURNING id INTO uuid variable
-- Root cause: trip_invitations.id is bigserial (bigint), but function used uuid
-- Fix: Return invitation_id as text and store id in bigint variable
-- Date: 2025-10-17
-- ================================================================

-- Drop old function to allow changing the returned row type
DROP FUNCTION IF EXISTS public.invite_to_trip_rpc(uuid, text, text) CASCADE;

CREATE FUNCTION public.invite_to_trip_rpc(
  p_trip_id uuid,
  p_email text,
  p_role text
)
RETURNS TABLE (
  invitation_id text,
  token text,
  trip_title text,
  inviter_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_owner_id uuid;
  v_normalized_email text;
  v_token text;
  v_trip_title text;
  v_inviter_name text;
  v_invitation_id bigint; -- matches trip_invitations.id (bigserial)
BEGIN
  -- Auth check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate inputs
  IF p_trip_id IS NULL THEN
    RAISE EXCEPTION 'trip_id is required';
  END IF;
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'email is required';
  END IF;
  IF p_role NOT IN ('viewer', 'editor') THEN
    RAISE EXCEPTION 'role must be viewer or editor';
  END IF;

  v_normalized_email := lower(trim(p_email));

  -- Verify ownership
  SELECT owner_id, title INTO v_owner_id, v_trip_title
  FROM trips WHERE id = p_trip_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;
  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only trip owners can send invitations';
  END IF;

  -- Get inviter name
  SELECT COALESCE(full_name, email, 'Goveling user')
  INTO v_inviter_name
  FROM profiles
  WHERE id = auth.uid();

  -- Check existing collaborator
  IF EXISTS (
    SELECT 1 
    FROM trip_collaborators tc
    JOIN profiles p ON p.id = tc.user_id
    WHERE tc.trip_id = p_trip_id 
      AND lower(trim(p.email)) = v_normalized_email
  ) THEN
    RAISE EXCEPTION 'User is already a collaborator on this trip';
  END IF;

  -- Cancel previous invitations
  UPDATE trip_invitations
  SET status = 'cancelled', updated_at = now()
  WHERE trip_id = p_trip_id
    AND lower(trim(email)) = v_normalized_email
    AND status = 'pending';

  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Create invitation
  INSERT INTO trip_invitations (
    trip_id, inviter_id, email, role, token, status,
    expires_at, created_at, updated_at
  ) VALUES (
    p_trip_id, auth.uid(), v_normalized_email, p_role, v_token, 'pending',
    now() + interval '7 days', now(), now()
  )
  RETURNING id INTO v_invitation_id; -- bigint

  RETURN QUERY SELECT v_invitation_id::text, v_token, v_trip_title, v_inviter_name;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Invitation failed: %', SQLERRM;
END;
$$;

-- Preserve execute permissions (no-op if already granted)
GRANT EXECUTE ON FUNCTION public.invite_to_trip_rpc(uuid, text, text) TO authenticated;
