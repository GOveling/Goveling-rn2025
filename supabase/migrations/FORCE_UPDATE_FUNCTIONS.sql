-- ================================================================
-- FORCE UPDATE: Fix search_path in invitation functions
-- Date: 2025-10-17
-- Description: Force replace functions with correct search_path
-- ================================================================

-- ================================================================
-- STEP 1: Force drop existing functions
-- ================================================================
DROP FUNCTION IF EXISTS public.invite_to_trip_rpc(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.accept_trip_invitation_rpc(text) CASCADE;

-- ================================================================
-- STEP 2: Recreate invite_to_trip_rpc with correct search_path
-- ================================================================
CREATE FUNCTION public.invite_to_trip_rpc(
  p_trip_id uuid,
  p_email text,
  p_role text
)
RETURNS TABLE (
  invitation_id uuid,
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
  v_invitation_id uuid;
BEGIN
  -- VALIDATION 1: Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- VALIDATION 2: Validate inputs
  IF p_trip_id IS NULL THEN
    RAISE EXCEPTION 'trip_id is required';
  END IF;
  
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'email is required';
  END IF;
  
  IF p_role NOT IN ('viewer', 'editor') THEN
    RAISE EXCEPTION 'role must be viewer or editor';
  END IF;

  -- Normalize email
  v_normalized_email := lower(trim(p_email));

  -- VALIDATION 3: Verify trip ownership
  SELECT owner_id, title 
  INTO v_owner_id, v_trip_title
  FROM trips 
  WHERE id = p_trip_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only trip owners can send invitations';
  END IF;

  -- VALIDATION 4: Get inviter name
  SELECT COALESCE(full_name, email, 'Goveling user')
  INTO v_inviter_name
  FROM profiles
  WHERE id = auth.uid();

  -- VALIDATION 5: Check if user is already a collaborator
  IF EXISTS (
    SELECT 1 
    FROM trip_collaborators tc
    JOIN profiles p ON p.id = tc.user_id
    WHERE tc.trip_id = p_trip_id 
      AND lower(trim(p.email)) = v_normalized_email
  ) THEN
    RAISE EXCEPTION 'User is already a collaborator on this trip';
  END IF;

  -- STEP 6: Cancel previous pending invitations
  UPDATE trip_invitations
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE 
    trip_id = p_trip_id
    AND lower(trim(email)) = v_normalized_email
    AND status = 'pending';

  -- STEP 7: Generate secure token (CRITICAL: using gen_random_bytes)
  v_token := encode(gen_random_bytes(32), 'hex');

  -- STEP 8: Create new invitation
  INSERT INTO trip_invitations (
    trip_id,
    inviter_id,
    email,
    role,
    token,
    status,
    expires_at,
    created_at,
    updated_at
  ) VALUES (
    p_trip_id,
    auth.uid(),
    v_normalized_email,
    p_role,
    v_token,
    'pending',
    now() + interval '7 days',
    now(),
    now()
  )
  RETURNING id INTO v_invitation_id;

  -- STEP 9: Return invitation details
  RETURN QUERY SELECT 
    v_invitation_id,
    v_token,
    v_trip_title,
    v_inviter_name;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Invitation failed: %', SQLERRM;
END;
$$;

-- ================================================================
-- STEP 3: Recreate accept_trip_invitation_rpc with correct search_path
-- ================================================================
CREATE FUNCTION public.accept_trip_invitation_rpc(
  p_token text
)
RETURNS TABLE (
  trip_id uuid,
  trip_title text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_invitation_id uuid;
  v_trip_id uuid;
  v_trip_title text;
  v_role text;
  v_inviter_id uuid;
  v_email text;
BEGIN
  -- VALIDATION 1: Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- VALIDATION 2: Validate token
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RAISE EXCEPTION 'Token is required';
  END IF;

  -- STEP 3: Find invitation by token
  SELECT 
    ti.id,
    ti.trip_id,
    ti.email,
    ti.role,
    ti.inviter_id,
    t.title
  INTO 
    v_invitation_id,
    v_trip_id,
    v_email,
    v_role,
    v_inviter_id,
    v_trip_title
  FROM trip_invitations ti
  JOIN trips t ON t.id = ti.trip_id
  WHERE ti.token = p_token
    AND ti.status = 'pending'
    AND ti.expires_at > now();

  -- VALIDATION 4: Check invitation exists and is valid
  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- VALIDATION 5: Verify email matches authenticated user
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND lower(trim(email)) = lower(trim(v_email))
  ) THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address';
  END IF;

  -- VALIDATION 6: Check if already a collaborator
  IF EXISTS (
    SELECT 1 FROM trip_collaborators
    WHERE trip_id = v_trip_id AND user_id = auth.uid()
  ) THEN
    -- Mark as accepted anyway
    UPDATE trip_invitations
    SET 
      status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = now(),
      updated_at = now()
    WHERE id = v_invitation_id;

    RETURN QUERY SELECT v_trip_id, v_trip_title, v_role;
    RETURN;
  END IF;

  -- STEP 7: Add user as collaborator
  INSERT INTO trip_collaborators (
    trip_id,
    user_id,
    role,
    added_by,
    added_at
  ) VALUES (
    v_trip_id,
    auth.uid(),
    v_role,
    v_inviter_id,
    now()
  );

  -- STEP 8: Mark invitation as accepted
  UPDATE trip_invitations
  SET 
    status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = now(),
    updated_at = now()
  WHERE id = v_invitation_id;

  -- STEP 9: Return trip details
  RETURN QUERY SELECT v_trip_id, v_trip_title, v_role;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to accept invitation: %', SQLERRM;
END;
$$;

-- ================================================================
-- STEP 4: Grant permissions
-- ================================================================
GRANT EXECUTE ON FUNCTION public.invite_to_trip_rpc(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_trip_invitation_rpc(text) TO authenticated;

-- ================================================================
-- STEP 5: Add comments
-- ================================================================
COMMENT ON FUNCTION public.invite_to_trip_rpc IS 
'Securely creates trip invitations with server-side validation (FIXED search_path)';

COMMENT ON FUNCTION public.accept_trip_invitation_rpc IS 
'Accepts a trip invitation using a secure token (FIXED search_path)';
