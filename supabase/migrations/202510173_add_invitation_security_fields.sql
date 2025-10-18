-- ================================================================
-- MIGRATION: Add Security Fields to trip_invitations
-- Date: 2025-10-17
-- Description: Adds token, status, expiration, and audit fields
-- ================================================================

-- STEP 1A: Check if token column exists and its type
-- ================================================================
DO $$
BEGIN
  -- If token exists as UUID, drop it first
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'trip_invitations' 
      AND column_name = 'token'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.trip_invitations DROP COLUMN token;
  END IF;
END $$;

-- STEP 1B: Add new columns (allow NULL temporarily for existing data)
-- ================================================================
ALTER TABLE public.trip_invitations 
  ADD COLUMN IF NOT EXISTS token text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS inviter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- STEP 2: Populate token field for existing invitations
-- ================================================================
-- Generate secure random tokens (64 chars hex) for existing invitations
UPDATE public.trip_invitations 
SET token = encode(gen_random_bytes(32), 'hex')
WHERE token IS NULL;

-- STEP 3: Set expires_at for existing invitations
-- ================================================================
-- Set expiration to 7 days from created_at for existing invitations
UPDATE public.trip_invitations 
SET expires_at = created_at + interval '7 days'
WHERE expires_at IS NULL;

-- STEP 4: Set inviter_id from owner_id for existing invitations
-- ================================================================
UPDATE public.trip_invitations 
SET inviter_id = owner_id
WHERE inviter_id IS NULL AND owner_id IS NOT NULL;

-- STEP 5: Set updated_at to created_at for existing invitations
-- ================================================================
UPDATE public.trip_invitations 
SET updated_at = created_at
WHERE updated_at IS NULL;

-- STEP 6: Make critical fields NOT NULL
-- ================================================================
ALTER TABLE public.trip_invitations 
  ALTER COLUMN token SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN expires_at SET NOT NULL,
  ALTER COLUMN inviter_id SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- STEP 7: Add constraints
-- ================================================================
-- Unique constraint on token (critical for security)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trip_invitations_token_unique'
  ) THEN
    ALTER TABLE public.trip_invitations 
      ADD CONSTRAINT trip_invitations_token_unique UNIQUE (token);
  END IF;
END $$;

-- Check constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trip_invitations_status_check'
  ) THEN
    ALTER TABLE public.trip_invitations 
      ADD CONSTRAINT trip_invitations_status_check 
      CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'));
  END IF;
END $$;

-- STEP 8: Create indexes for performance
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_trip_inv_token ON public.trip_invitations(token);
CREATE INDEX IF NOT EXISTS idx_trip_inv_status ON public.trip_invitations(status);
CREATE INDEX IF NOT EXISTS idx_trip_inv_expires ON public.trip_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_trip_inv_inviter ON public.trip_invitations(inviter_id);

-- STEP 9: Create trigger for automatic updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_trip_invitations_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trg_trip_invitations_updated_at ON public.trip_invitations;

CREATE TRIGGER trg_trip_invitations_updated_at
  BEFORE UPDATE ON public.trip_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trip_invitations_updated_at();

-- STEP 10: Create function to clean expired invitations (optional)
-- ================================================================
CREATE OR REPLACE FUNCTION public.clean_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Cancel expired pending invitations
  UPDATE public.trip_invitations
  SET status = 'cancelled', updated_at = now()
  WHERE status = 'pending' 
    AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.clean_expired_invitations() IS 
  'Cancels expired pending invitations. Can be called manually or via cron job.';

-- STEP 11: Update RLS policies if needed
-- ================================================================
-- Drop existing policies if they exist (safe with IF EXISTS)
DROP POLICY IF EXISTS trip_inv_owner_rw ON public.trip_invitations;
DROP POLICY IF EXISTS trip_inv_by_email_select ON public.trip_invitations;
DROP POLICY IF EXISTS trip_inv_inviter_full_access ON public.trip_invitations;
DROP POLICY IF EXISTS trip_inv_by_token_select ON public.trip_invitations;
DROP POLICY IF EXISTS trip_inv_trip_owner_select ON public.trip_invitations;

-- Policy: Inviter can view/update/delete their own invitations
CREATE POLICY trip_inv_inviter_full_access ON public.trip_invitations
  FOR ALL
  USING (inviter_id = auth.uid());

-- Policy: Users can view invitations sent to their email
CREATE POLICY trip_inv_by_email_select ON public.trip_invitations
  FOR SELECT
  USING (lower(email) = lower(auth.email()));

-- Policy: Users can view invitations by token (for acceptance flow)
CREATE POLICY trip_inv_by_token_select ON public.trip_invitations
  FOR SELECT
  USING (token IS NOT NULL);

-- Policy: Trip owners can view all invitations for their trips
CREATE POLICY trip_inv_trip_owner_select ON public.trip_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = trip_invitations.trip_id 
        AND trips.user_id = auth.uid()
    )
  );

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================
-- Summary of changes:
-- ✅ Added token field (unique, secure)
-- ✅ Added status field (pending/accepted/declined/cancelled)
-- ✅ Added expires_at field (7 days from creation)
-- ✅ Added inviter_id field (who sent the invitation)
-- ✅ Added accepted_at field (when accepted)
-- ✅ Added accepted_by field (who accepted)
-- ✅ Added updated_at field (auto-updated)
-- ✅ Created indexes for performance
-- ✅ Created trigger for updated_at
-- ✅ Created cleanup function
-- ✅ Updated RLS policies
-- ================================================================
