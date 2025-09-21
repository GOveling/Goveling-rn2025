/*
  # Add trip_place_visits table for tracking visited places

  This migration is mostly redundant since trip_place_visits was already created 
  in migration 17, but we'll handle any remaining setup.

  FIXED VERSION: Skip redundant operations and fix policy references
*/

-- Table already exists from migration 17, so we skip CREATE TABLE

-- Try to add any missing constraints (will skip if they exist)
DO $$ 
BEGIN
  -- Foreign key to users (trips table doesn't exist so we skip that one)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trip_place_visits_user_id_fkey'
    AND table_name = 'trip_place_visits'
  ) THEN
    ALTER TABLE public.trip_place_visits 
    ADD CONSTRAINT trip_place_visits_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, continue
    NULL;
END $$;

-- Add indexes (IF NOT EXISTS will handle duplicates)
CREATE INDEX IF NOT EXISTS idx_trip_place_visits_trip_id ON public.trip_place_visits(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_place_visits_user_id ON public.trip_place_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_place_visits_place_id ON public.trip_place_visits(place_id);

-- RLS should already be enabled from migration 17
ALTER TABLE public.trip_place_visits ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policy first
DROP POLICY IF EXISTS "Trip participants can manage visits" ON public.trip_place_visits;

-- Create a working policy (without trips table reference)
CREATE POLICY "Trip participants can manage visits"
  ON public.trip_place_visits
  FOR ALL
  TO authenticated
  USING (
    -- Allow if user is a collaborator of the trip (only reference we can make)
    trip_id IN (
      SELECT tc.trip_id FROM public.trip_collaborators tc WHERE tc.user_id = auth.uid()
    )
    -- Or if user created the visit
    OR user_id = auth.uid()
  );

-- Success message
SELECT 'trip_place_visits setup completed (migration 19)!' as result;
