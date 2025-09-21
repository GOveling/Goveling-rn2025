/*
  # Update trip_place_visits table

  The table already exists but is missing the user_id column and some other columns.
  This migration will add the missing columns and create the proper policies.

  FIXED VERSION V8: Add missing columns to existing table
*/

-- Add missing columns to existing table
ALTER TABLE public.trip_place_visits 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.trip_place_visits 
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Update visited_at to have proper default if it doesn't
ALTER TABLE public.trip_place_visits 
ALTER COLUMN visited_at SET DEFAULT now();

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_trip_place_visits_trip 
  ON public.trip_place_visits (trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_place_visits_user 
  ON public.trip_place_visits (user_id);

CREATE INDEX IF NOT EXISTS idx_trip_place_visits_place 
  ON public.trip_place_visits (trip_id, place_id);

-- Enable RLS if not already enabled
ALTER TABLE public.trip_place_visits ENABLE ROW LEVEL SECURITY;

-- Drop any existing problematic policies
DROP POLICY IF EXISTS "Trip collaborators can manage place visits" ON public.trip_place_visits;
DROP POLICY IF EXISTS "Users can manage their own place visits" ON public.trip_place_visits;
DROP POLICY IF EXISTS "Trip collaborators can view place visits" ON public.trip_place_visits;
DROP POLICY IF EXISTS "Allow authenticated users to manage place visits" ON public.trip_place_visits;

-- Create a simple working policy now that user_id column exists
CREATE POLICY "Users can manage their own place visits"
  ON public.trip_place_visits
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add policy for trip collaborators now that the table structure is correct
CREATE POLICY "Trip collaborators can view place visits"
  ON public.trip_place_visits
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT tc.trip_id 
      FROM public.trip_collaborators tc 
      WHERE tc.user_id = auth.uid()
    )
  );

-- Success message
SELECT 'trip_place_visits table updated successfully with missing columns and policies!' as result;
