-- Finalize RLS to resolve recursion and owner access

-- Fix trips owner policy to use owner_id (with legacy user_id fallback)
DROP POLICY IF EXISTS "trips_owner_full_access" ON public.trips;
CREATE POLICY "trips_owner_full_access"
  ON public.trips
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid() OR user_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() OR user_id = auth.uid());

-- Keep collaborator read policy but ensure it exists in final state
DROP POLICY IF EXISTS "trips_collaborator_read" ON public.trips;
CREATE POLICY "trips_collaborator_read"
  ON public.trips
  FOR SELECT
  TO authenticated
  USING (
    (trips.status IS NULL OR trips.status <> 'cancelled')
    AND EXISTS (
      SELECT 1 FROM public.trip_collaborators tc
      WHERE tc.trip_id = trips.id AND tc.user_id = auth.uid()
    )
  );

-- Ensure trip_collaborators uses non-recursive policies (self/added_by only)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trip_collaborators' AND policyname='collaborators_select_owner_or_self') THEN
    DROP POLICY collaborators_select_owner_or_self ON public.trip_collaborators;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trip_collaborators' AND policyname='collaborators_insert_owner_only') THEN
    DROP POLICY collaborators_insert_owner_only ON public.trip_collaborators;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trip_collaborators' AND policyname='collaborators_update_owner_only') THEN
    DROP POLICY collaborators_update_owner_only ON public.trip_collaborators;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trip_collaborators' AND policyname='collaborators_delete_owner_only') THEN
    DROP POLICY collaborators_delete_owner_only ON public.trip_collaborators;
  END IF;
END $$;

DROP POLICY IF EXISTS trip_collaborators_select_self_or_adder ON public.trip_collaborators;
CREATE POLICY trip_collaborators_select_self_or_adder
  ON public.trip_collaborators
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR added_by = auth.uid()
  );

DROP POLICY IF EXISTS trip_collaborators_insert_by_owner ON public.trip_collaborators;
CREATE POLICY trip_collaborators_insert_by_owner
  ON public.trip_collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    added_by = auth.uid()
  );

DROP POLICY IF EXISTS trip_collaborators_update_by_owner ON public.trip_collaborators;
CREATE POLICY trip_collaborators_update_by_owner
  ON public.trip_collaborators
  FOR UPDATE
  TO authenticated
  USING (
    added_by = auth.uid()
  );

DROP POLICY IF EXISTS trip_collaborators_delete_by_owner ON public.trip_collaborators;
CREATE POLICY trip_collaborators_delete_by_owner
  ON public.trip_collaborators
  FOR DELETE
  TO authenticated
  USING (
    added_by = auth.uid()
  );
