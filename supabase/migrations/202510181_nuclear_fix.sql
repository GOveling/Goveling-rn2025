-- ================================================================
-- NUCLEAR FIX: Force delete and recreate ALL invitation functions
-- ================================================================

-- STEP 1: Drop ALL possible variations of these functions
DO $$ 
BEGIN
  -- Drop with all possible signatures
  DROP FUNCTION IF EXISTS public.invite_to_trip_rpc(uuid, text, text) CASCADE;
  DROP FUNCTION IF EXISTS public.accept_trip_invitation_rpc(text) CASCADE;
  DROP FUNCTION IF EXISTS invite_to_trip_rpc CASCADE;
  DROP FUNCTION IF EXISTS accept_trip_invitation_rpc CASCADE;
END $$;

-- STEP 2: Ensure pgcrypto is in extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- STEP 3: Create invite function with EXPLICIT search_path
CREATE OR REPLACE FUNCTION public.invite_to_trip_rpc(
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

  -- CRITICAL: Generate token using gen_random_bytes from extensions schema
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Create invitation
  INSERT INTO trip_invitations (
    trip_id, inviter_id, email, role, token, status,
    expires_at, created_at, updated_at
  ) VALUES (
    p_trip_id, auth.uid(), v_normalized_email, p_role, v_token, 'pending',
    now() + interval '7 days', now(), now()
  )
  RETURNING id INTO v_invitation_id;

  RETURN QUERY SELECT v_invitation_id, v_token, v_trip_title, v_inviter_name;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Invitation failed: %', SQLERRM;
END;
$$;

-- STEP 4: Create accept function with EXPLICIT search_path
CREATE OR REPLACE FUNCTION public.accept_trip_invitation_rpc(
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
  -- Auth check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate token
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RAISE EXCEPTION 'Token is required';
  END IF;

  -- Find invitation
  SELECT ti.id, ti.trip_id, ti.email, ti.role, ti.inviter_id, t.title
  INTO v_invitation_id, v_trip_id, v_email, v_role, v_inviter_id, v_trip_title
  FROM trip_invitations ti
  JOIN trips t ON t.id = ti.trip_id
  WHERE ti.token = p_token
    AND ti.status = 'pending'
    AND ti.expires_at > now();

  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Verify email match
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND lower(trim(email)) = lower(trim(v_email))
  ) THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address';
  END IF;

  -- Check if already collaborator
  IF EXISTS (
    SELECT 1 FROM trip_collaborators
    WHERE trip_id = v_trip_id AND user_id = auth.uid()
  ) THEN
    UPDATE trip_invitations
    SET status = 'accepted', accepted_by = auth.uid(), 
        accepted_at = now(), updated_at = now()
    WHERE id = v_invitation_id;
    
    RETURN QUERY SELECT v_trip_id, v_trip_title, v_role;
    RETURN;
  END IF;

  -- Add collaborator
  INSERT INTO trip_collaborators (trip_id, user_id, role, added_by, added_at)
  VALUES (v_trip_id, auth.uid(), v_role, v_inviter_id, now());

  -- Mark accepted
  UPDATE trip_invitations
  SET status = 'accepted', accepted_by = auth.uid(),
      accepted_at = now(), updated_at = now()
  WHERE id = v_invitation_id;

  RETURN QUERY SELECT v_trip_id, v_trip_title, v_role;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to accept invitation: %', SQLERRM;
END;
$$;

-- STEP 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.invite_to_trip_rpc(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_trip_invitation_rpc(text) TO authenticated;

-- STEP 6: Verify the fix was applied
DO $$
DECLARE
  v_invite_has_fix boolean;
  v_accept_has_fix boolean;
BEGIN
  -- Check invite function
  SELECT prosrc LIKE '%search_path = public, extensions%'
  INTO v_invite_has_fix
  FROM pg_proc
  WHERE proname = 'invite_to_trip_rpc'
    AND pronamespace = 'public'::regnamespace;

  -- Check accept function  
  SELECT prosrc LIKE '%search_path = public, extensions%'
  INTO v_accept_has_fix
  FROM pg_proc
  WHERE proname = 'accept_trip_invitation_rpc'
    AND pronamespace = 'public'::regnamespace;

  IF NOT v_invite_has_fix THEN
    RAISE EXCEPTION 'ERROR: invite_to_trip_rpc does not have search_path fix!';
  END IF;

  IF NOT v_accept_has_fix THEN
    RAISE EXCEPTION 'ERROR: accept_trip_invitation_rpc does not have search_path fix!';
  END IF;

  RAISE NOTICE '✅ SUCCESS: Both functions have search_path = public, extensions';
END $$;
