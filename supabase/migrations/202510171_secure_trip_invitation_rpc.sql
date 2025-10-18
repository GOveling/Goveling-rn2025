-- ================================================================
-- MIGRATION: Secure Trip Invitation System with RPC
-- Date: 2025-10-17
-- Description: Server-side invitation logic with all validations
-- ================================================================

-- ================================================================
-- STEP 0: Enable pgcrypto extension for secure token generation
-- ================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- STEP 1: Drop old function if exists
-- ================================================================
DROP FUNCTION IF EXISTS public.send_trip_invitation CASCADE;
DROP FUNCTION IF EXISTS public.invite_to_trip_rpc CASCADE;

-- ================================================================
-- STEP 2: Create secure RPC function for invitations
-- ================================================================
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
  -- ================================================================
  -- VALIDATION 1: Check authentication
  -- ================================================================
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- ================================================================
  -- VALIDATION 2: Validate inputs
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

  -- Normalize email (lowercase + trim)
  v_normalized_email := lower(trim(p_email));

  -- ================================================================
  -- VALIDATION 3: Verify trip ownership (CRITICAL SECURITY)
  -- ================================================================
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

  -- ================================================================
  -- VALIDATION 4: Get inviter name
  -- ================================================================
  SELECT COALESCE(full_name, email, 'Goveling user')
  INTO v_inviter_name
  FROM profiles
  WHERE id = auth.uid();

  -- ================================================================
  -- VALIDATION 5: Check if user is already a collaborator
  -- ================================================================
  IF EXISTS (
    SELECT 1 
    FROM trip_collaborators tc
    JOIN profiles p ON p.id = tc.user_id
    WHERE tc.trip_id = p_trip_id 
      AND lower(trim(p.email)) = v_normalized_email
  ) THEN
    RAISE EXCEPTION 'User is already a collaborator on this trip';
  END IF;

  -- ================================================================
  -- STEP 6: Cancel previous pending invitations (atomically)
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
  -- STEP 7: Generate secure token (64 hex characters)
  -- ================================================================
  v_token := encode(public.gen_random_bytes(32), 'hex');

  -- ================================================================
  -- STEP 8: Create new invitation (atomic transaction)
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
    v_token,
    'pending',
    now() + interval '7 days',
    now(),
    now()
  )
  RETURNING id INTO v_invitation_id;

  -- ================================================================
  -- STEP 9: Return invitation details
  -- ================================================================
  RETURN QUERY SELECT 
    v_invitation_id,
    v_token,
    v_trip_title,
    v_inviter_name;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise with context
    RAISE EXCEPTION 'Invitation failed: %', SQLERRM;
END;
$$;

-- ================================================================
-- STEP 3: Grant permissions
-- ================================================================
GRANT EXECUTE ON FUNCTION public.invite_to_trip_rpc(uuid, text, text) TO authenticated;

-- ================================================================
-- STEP 4: Add helpful comment
-- ================================================================
COMMENT ON FUNCTION public.invite_to_trip_rpc IS 
'Securely creates trip invitations with server-side validation. 
Only trip owners can send invitations. 
Automatically cancels previous pending invitations for the same email.
Returns invitation_id, token, trip_title, and inviter_name.';

-- ================================================================
-- STEP 5: Create RPC function to accept invitation
-- ================================================================
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
  -- ================================================================
  -- VALIDATION 1: Check authentication
  -- ================================================================
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- ================================================================
  -- VALIDATION 2: Validate token
  -- ================================================================
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RAISE EXCEPTION 'Token is required';
  END IF;

  -- ================================================================
  -- STEP 3: Find invitation by token
  -- ================================================================
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

  -- ================================================================
  -- VALIDATION 4: Check invitation exists and is valid
  -- ================================================================
  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- ================================================================
  -- VALIDATION 5: Verify email matches authenticated user
  -- ================================================================
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND lower(trim(email)) = lower(trim(v_email))
  ) THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address';
  END IF;

  -- ================================================================
  -- VALIDATION 6: Check if already a collaborator
  -- ================================================================
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

  -- ================================================================
  -- STEP 7: Add user as collaborator (atomic)
  -- ================================================================
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

  -- ================================================================
  -- STEP 8: Mark invitation as accepted
  -- ================================================================
  UPDATE trip_invitations
  SET 
    status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = now(),
    updated_at = now()
  WHERE id = v_invitation_id;

  -- ================================================================
  -- STEP 9: Return trip details
  -- ================================================================
  RETURN QUERY SELECT v_trip_id, v_trip_title, v_role;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to accept invitation: %', SQLERRM;
END;
$$;

-- ================================================================
-- Grant permissions for accept function
-- ================================================================
GRANT EXECUTE ON FUNCTION public.accept_trip_invitation_rpc(text) TO authenticated;

COMMENT ON FUNCTION public.accept_trip_invitation_rpc IS 
'Accepts a trip invitation using a secure token.
Validates token, expiration, and email match.
Adds user as collaborator and marks invitation as accepted.
Returns trip_id, trip_title, and role.';

-- ================================================================
-- STEP 6: Create unique constraint to prevent duplicate pending invitations
-- ================================================================
CREATE UNIQUE INDEX IF NOT EXISTS trip_invitations_unique_pending 
ON trip_invitations(trip_id, lower(trim(email))) 
WHERE status = 'pending';

-- ================================================================
-- STEP 7: Create index for fast email lookups (case-insensitive)
-- ================================================================
CREATE INDEX IF NOT EXISTS trip_invitations_email_lower_idx 
ON trip_invitations(lower(trim(email)));

CREATE INDEX IF NOT EXISTS profiles_email_lower_idx 
ON profiles(lower(trim(email)));

-- ================================================================
-- STEP 8: Add check constraint for role
-- ================================================================
ALTER TABLE trip_invitations 
DROP CONSTRAINT IF EXISTS trip_invitations_role_check;

ALTER TABLE trip_invitations 
ADD CONSTRAINT trip_invitations_role_check 
CHECK (role IN ('viewer', 'editor'));

-- ================================================================
-- STEP 9: Ensure accepted_by and accepted_at columns exist
-- ================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trip_invitations' 
    AND column_name = 'accepted_by'
  ) THEN
    ALTER TABLE trip_invitations 
    ADD COLUMN accepted_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trip_invitations' 
    AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE trip_invitations 
    ADD COLUMN accepted_at timestamptz;
  END IF;
END $$;

-- ================================================================
-- STEP 10: Create trigger to update updated_at automatically
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trip_invitations_updated_at ON trip_invitations;

CREATE TRIGGER trip_invitations_updated_at
  BEFORE UPDATE ON trip_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- STEP 11: Add helpful indexes for performance
-- ================================================================
CREATE INDEX IF NOT EXISTS trip_invitations_token_idx ON trip_invitations(token);
CREATE INDEX IF NOT EXISTS trip_invitations_status_idx ON trip_invitations(status);
CREATE INDEX IF NOT EXISTS trip_invitations_expires_at_idx ON trip_invitations(expires_at);
CREATE INDEX IF NOT EXISTS trip_collaborators_trip_user_idx ON trip_collaborators(trip_id, user_id);

-- ================================================================
-- COMPLETED
-- ================================================================
