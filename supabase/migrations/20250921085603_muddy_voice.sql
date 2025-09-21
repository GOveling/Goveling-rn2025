/*
  # Fix trips table RLS infinite recursion

  1. Remove problematic recursive policies
  2. Create simple, non-recursive policies for trips table
  3. Ensure no circular dependencies with trip_collaborators
*/

-- Drop all existing policies on trips table
DROP POLICY IF EXISTS "trips_modify" ON trips;
DROP POLICY IF EXISTS "trips_select" ON trips;

-- Create simple, non-recursive policies for trips
CREATE POLICY "trips_owner_full_access"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trips_collaborator_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_collaborators tc
      WHERE tc.trip_id = trips.id AND tc.user_id = auth.uid()
    )
  );