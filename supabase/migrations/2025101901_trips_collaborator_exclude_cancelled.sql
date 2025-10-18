/*
  # Harden trips collaborator visibility: exclude cancelled trips

  - Drops existing collaborator SELECT policy on trips
  - Recreates it with an additional condition to hide trips where status = 'cancelled'
  - Owners keep full access via existing trips_owner_full_access policy

  Safety: Uses simple EXISTS on trip_collaborators to avoid recursion.
*/

-- Drop previous collaborator-read policy if exists
DROP POLICY IF EXISTS "trips_collaborator_read" ON trips;

-- Recreate collaborator-read policy with cancelled filter
CREATE POLICY "trips_collaborator_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    -- Do not expose cancelled trips to collaborators
    (trips.status IS NULL OR trips.status <> 'cancelled')
    AND EXISTS (
      SELECT 1
      FROM trip_collaborators tc
      WHERE tc.trip_id = trips.id
        AND tc.user_id = auth.uid()
    )
  );

-- Note: Owner full access remains in "trips_owner_full_access" policy.
