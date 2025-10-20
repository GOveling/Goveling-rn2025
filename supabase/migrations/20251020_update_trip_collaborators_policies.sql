--
-- Fix trip_collaborators RLS to use trips.owner_id (with legacy user_id fallback)
-- and ensure only the trip owner can update/delete collaborator rows.
-- Also allow owners to SELECT all collaborators of their trips so realtime
-- changes are visible in the Manage Team screen.
--
-- Why: Previous policies referenced trips.user_id only. In our schema, owner_id
-- is the canonical owner field. This mismatch blocked owner actions like
-- removing collaborators or toggling roles and prevented realtime updates.
--

-- Safety: keep RLS enabled and replace policies atomically
ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "collaborators_select_own" ON public.trip_collaborators;
DROP POLICY IF EXISTS "collaborators_insert_owner" ON public.trip_collaborators;
DROP POLICY IF EXISTS "collaborators_update_owner" ON public.trip_collaborators;
DROP POLICY IF EXISTS "collaborators_delete_owner" ON public.trip_collaborators;

-- SELECT
-- Allow:
--  - the row owner (collaborator themselves) to read their own row
--  - the trip owner to read all collaborator rows for their trips
CREATE POLICY collaborators_select_owner_or_self
  ON public.trip_collaborators
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_collaborators.trip_id
        AND (t.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
  );

-- INSERT
-- Only the trip owner can add collaborators
CREATE POLICY collaborators_insert_owner_only
  ON public.trip_collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_collaborators.trip_id
        AND (t.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
  );

-- UPDATE
-- Only the trip owner can change collaborator roles
CREATE POLICY collaborators_update_owner_only
  ON public.trip_collaborators
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_collaborators.trip_id
        AND (t.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
  );

-- DELETE
-- Only the trip owner can remove collaborators
CREATE POLICY collaborators_delete_owner_only
  ON public.trip_collaborators
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_collaborators.trip_id
        AND (t.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
  );

-- Optional: If you later add a status column constraint (e.g. active members only),
-- you can AND it into the EXISTS predicate as needed.
