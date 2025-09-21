/*
  # Remove all trip_collaborators policies to fix infinite recursion

  This migration completely removes all RLS policies from trip_collaborators
  and creates simple, non-recursive policies that avoid any circular references.

  1. Security Changes
    - Drop all existing policies on trip_collaborators
    - Create simple policies that don't reference other tables with complex joins
    - Ensure no circular dependencies between trips and trip_collaborators policies
*/

-- Disable RLS temporarily to clean up
ALTER TABLE trip_collaborators DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on trip_collaborators
DROP POLICY IF EXISTS "Trip owners can manage collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Users can view own collaborations" ON trip_collaborators;
DROP POLICY IF EXISTS "trip_collaborators_owner_rw" ON trip_collaborators;
DROP POLICY IF EXISTS "trip_collaborators_user_select" ON trip_collaborators;

-- Re-enable RLS
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
CREATE POLICY "collaborators_select_own" 
  ON trip_collaborators 
  FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "collaborators_insert_owner" 
  ON trip_collaborators 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "collaborators_update_owner" 
  ON trip_collaborators 
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "collaborators_delete_owner" 
  ON trip_collaborators 
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  );