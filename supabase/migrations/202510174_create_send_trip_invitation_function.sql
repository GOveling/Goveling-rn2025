-- ================================================================
-- FUNCTION: send_trip_invitation
-- Date: 2025-10-17
-- Description: Securely creates trip invitations with validation
-- ================================================================

CREATE OR REPLACE FUNCTION public.send_trip_invitation(
  p_trip_id uuid,
  p_email text,
  p_role text,
  p_token text
) 
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation_id uuid;
  v_trip_name text;
  v_inviter_name text;
  v_normalized_email text;
BEGIN
  -- ================================================================
  -- STEP 1: Validate inputs
  -- ================================================================
  IF p_trip_id IS NULL THEN
    RAISE EXCEPTION 'trip_id is required';
  END IF;
  
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'email is required';
  END IF;
  
  IF p_role NOT IN ('viewer', 'editor') THEN
    RAISE EXCEPTION 'role must be viewer or editor';
  END IF;
  
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RAISE EXCEPTION 'token must be at least 32 characters';
  END IF;
  
  -- Normalize email
  v_normalized_email := lower(trim(p_email));
  
  -- ================================================================
  -- STEP 2: Verify ownership (CRITICAL SECURITY CHECK)
  -- ================================================================
  IF NOT EXISTS (
    SELECT 1 FROM trips 
    WHERE id = p_trip_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only trip owners can send invitations';
  END IF;
  
  -- ================================================================
  -- STEP 3: Get trip and inviter information
  -- ================================================================
  SELECT t.title INTO v_trip_name
  FROM trips t
  WHERE t.id = p_trip_id;
  
  SELECT p.full_name INTO v_inviter_name
  FROM profiles p
  WHERE p.id = auth.uid();
  
  -- ================================================================
  -- STEP 4: Cancel any previous pending invitations for same email+trip
  -- ================================================================
  UPDATE trip_invitations
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE 
    trip_id = p_trip_id
    AND lower(trim(email)) = v_normalized_email
    AND status = 'pending';
  
  -- ================================================================
  -- STEP 5: Check if user is already a collaborator
  -- ================================================================
  IF EXISTS (
    SELECT 1 FROM trip_collaborators tc
    JOIN profiles p ON p.id = tc.user_id
    WHERE tc.trip_id = p_trip_id 
      AND lower(trim(p.email)) = v_normalized_email
  ) THEN
    RAISE EXCEPTION 'User is already a collaborator on this trip';
  END IF;
  
  -- ================================================================
  -- STEP 6: Create new invitation
  -- ================================================================
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
    p_token,
    'pending',
    now() + interval '7 days',
    now(),
    now()
  )
  RETURNING id INTO v_invitation_id;
  
  -- ================================================================
  -- STEP 7: Return invitation ID
  -- ================================================================
  RETURN v_invitation_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception with context
    RAISE EXCEPTION 'send_trip_invitation failed: %', SQLERRM;
END;
$$;

-- ================================================================
-- Add comment for documentation
-- ================================================================
COMMENT ON FUNCTION public.send_trip_invitation(uuid, text, text, text) IS 
'Securely creates a trip invitation with the following features:
- Validates user is trip owner
- Normalizes email to lowercase
- Cancels previous pending invitations for same email+trip
- Checks if user is already a collaborator
- Sets expiration to 7 days from creation
- Returns the new invitation UUID';

-- ================================================================
-- Grant execute permission to authenticated users
-- ================================================================
GRANT EXECUTE ON FUNCTION public.send_trip_invitation(uuid, text, text, text) 
  TO authenticated;

-- ================================================================
-- FUNCTION COMPLETE
-- ================================================================
