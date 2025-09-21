/*
  # Fix trip_collaborators RLS infinite recursion

  1. Security Changes
    - Remove recursive RLS policies on trip_collaborators table
    - Add simple, non-recursive policies for basic access control
    - Ensure policies don't reference trip_collaborators within their own conditions

  2. Policy Updates
    - Users can read their own collaborator records
    - Trip owners can manage all collaborators for their trips
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "trip_collab_owner_rw" ON trip_collaborators;
DROP POLICY IF EXISTS "Trip collaborators can manage route cache" ON route_cache;
DROP POLICY IF EXISTS "Trip collaborators can view place visits" ON trip_place_visits;
DROP POLICY IF EXISTS "Trip participants can manage visits" ON trip_place_visits;

-- Create simple, non-recursive policies for trip_collaborators
CREATE POLICY "Users can read own collaborations"
  ON trip_collaborators
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

CREATE POLICY "Trip owners can manage collaborators"
  ON trip_collaborators
  FOR ALL
  TO public
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- Fix route_cache policy to avoid trip_collaborators reference
CREATE POLICY "Users can manage route cache for owned trips"
  ON route_cache
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- Fix trip_place_visits policies
CREATE POLICY "Users can view visits for accessible trips"
  ON trip_place_visits
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own visits"
  ON trip_place_visits
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());