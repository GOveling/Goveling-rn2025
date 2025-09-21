/*
  # Fix trip_collaborators RLS policies

  1. Security Changes
    - Drop all existing policies on trip_collaborators to prevent recursion
    - Create simple, non-recursive policies
    - Fix related policies on route_cache and trip_place_visits
*/

-- Drop all existing policies on trip_collaborators
DROP POLICY IF EXISTS "Trip owners can manage collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Users can read own collaborations" ON trip_collaborators;
DROP POLICY IF EXISTS "trip_collab_owner_rw" ON trip_collaborators;
DROP POLICY IF EXISTS "trip_collab_user_select" ON trip_collaborators;

-- Create simple, non-recursive policies
CREATE POLICY "collaborators_select_own"
  ON trip_collaborators
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "collaborators_owners_manage"
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

-- Fix route_cache policies to avoid recursion
DROP POLICY IF EXISTS "Users can manage route cache for owned trips" ON route_cache;
DROP POLICY IF EXISTS "Users can manage route cache for their trips" ON route_cache;

CREATE POLICY "route_cache_owners"
  ON route_cache
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = route_cache.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- Fix trip_place_visits policies to avoid recursion  
DROP POLICY IF EXISTS "Users can view visits for accessible trips" ON trip_place_visits;

CREATE POLICY "trip_place_visits_select_simple"
  ON trip_place_visits
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_place_visits.trip_id 
      AND trips.user_id = auth.uid()
    )
  );