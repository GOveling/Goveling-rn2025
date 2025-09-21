/*
  # Fix trip_collaborators RLS infinite recursion

  1. Security Changes
    - Drop all existing policies on trip_collaborators that cause recursion
    - Create simple, non-recursive policies
    - Users can read their own collaborations
    - Trip owners can manage collaborators for their trips

  2. Notes
    - Removes circular dependencies in RLS policies
    - Uses direct auth.uid() checks without subqueries
*/

-- Drop all existing policies on trip_collaborators
DROP POLICY IF EXISTS "Trip owners can manage collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Users can read own collaborations" ON trip_collaborators;

-- Create simple, non-recursive policies
CREATE POLICY "Users can read own collaborations"
  ON trip_collaborators
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Trip owners can manage collaborators"
  ON trip_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  );