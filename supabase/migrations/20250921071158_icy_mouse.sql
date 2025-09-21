/*
  # Fix trip_collaborators infinite recursion

  1. Security Changes
    - Drop all existing RLS policies on trip_collaborators
    - Create simple, non-recursive policies
    - Fix related policies that might cause recursion

  2. Policy Changes
    - Simple SELECT policy for users to see their own collaborations
    - Simple policy for trip owners to manage collaborators
    - Remove any complex subqueries that cause recursion
*/

-- Drop all existing policies on trip_collaborators
DROP POLICY IF EXISTS "collaborators_owners_manage" ON trip_collaborators;
DROP POLICY IF EXISTS "collaborators_select_own" ON trip_collaborators;
DROP POLICY IF EXISTS "trip_collaborators_select" ON trip_collaborators;
DROP POLICY IF EXISTS "trip_collaborators_insert" ON trip_collaborators;
DROP POLICY IF EXISTS "trip_collaborators_update" ON trip_collaborators;
DROP POLICY IF EXISTS "trip_collaborators_delete" ON trip_collaborators;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own collaborations"
  ON trip_collaborators
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Trip owners can manage collaborators"
  ON trip_collaborators
  FOR ALL
  TO authenticated
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

-- Also fix any related policies that might reference trip_collaborators
DROP POLICY IF EXISTS "trips_select" ON trips;
CREATE POLICY "trips_select"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    id IN (
      SELECT tc.trip_id 
      FROM trip_collaborators tc 
      WHERE tc.user_id = auth.uid()
    )
  );

-- Fix route_cache policies to avoid recursion
DROP POLICY IF EXISTS "route_cache_owners" ON route_cache;
CREATE POLICY "route_cache_owners"
  ON route_cache
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- Fix trip_place_visits policies
DROP POLICY IF EXISTS "trip_place_visits_select_simple" ON trip_place_visits;
CREATE POLICY "trip_place_visits_select_simple"
  ON trip_place_visits
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );