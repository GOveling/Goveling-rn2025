-- Migration: Restrict trip_places write operations to Owner/Editor; Viewers read-only
-- Date: 2025-10-20

-- Safety: enable RLS (if not already)
ALTER TABLE public.trip_places ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies that allowed any collaborator to write
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trip_places' AND policyname = 'Users can add places to trips they have access to') THEN
    DROP POLICY "Users can add places to trips they have access to" ON public.trip_places;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trip_places' AND policyname = 'Users can update trip places they have access to') THEN
    DROP POLICY "Users can update trip places they have access to" ON public.trip_places;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trip_places' AND policyname = 'Users can delete trip places they have access to') THEN
    DROP POLICY "Users can delete trip places they have access to" ON public.trip_places;
  END IF;
  -- Legacy consolidated policy name
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trip_places' AND policyname = 'trip_places_rw') THEN
    DROP POLICY trip_places_rw ON public.trip_places;
  END IF;
END$$;

-- Helper condition fragments:
-- Owner condition: trip owned by current user (owner_id or legacy user_id)
-- Editor condition: collaborator with role = 'editor' and status active

-- SELECT policy: allow owners and any collaborators (viewer/editor)
CREATE POLICY IF NOT EXISTS "trip_places_select_for_team" ON public.trip_places
  FOR SELECT
  USING (
    trip_id IN (
      SELECT t.id FROM public.trips t
      WHERE t.owner_id = auth.uid() OR t.user_id = auth.uid()
      UNION
      SELECT tc.trip_id FROM public.trip_collaborators tc
      WHERE tc.user_id = auth.uid()
    )
  );

-- INSERT policy: allow only owners or editor collaborators
CREATE POLICY IF NOT EXISTS "trip_places_insert_owner_or_editor" ON public.trip_places
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT t.id FROM public.trips t
      WHERE t.owner_id = auth.uid() OR t.user_id = auth.uid()
      UNION
      SELECT tc.trip_id FROM public.trip_collaborators tc
      WHERE tc.user_id = auth.uid()
        AND coalesce(tc.status, 'active') = 'active'
        AND coalesce(tc.role, 'viewer') = 'editor'
    )
  );

-- UPDATE policy: allow only owners or editor collaborators
CREATE POLICY IF NOT EXISTS "trip_places_update_owner_or_editor" ON public.trip_places
  FOR UPDATE
  USING (
    trip_id IN (
      SELECT t.id FROM public.trips t
      WHERE t.owner_id = auth.uid() OR t.user_id = auth.uid()
      UNION
      SELECT tc.trip_id FROM public.trip_collaborators tc
      WHERE tc.user_id = auth.uid()
        AND coalesce(tc.status, 'active') = 'active'
        AND coalesce(tc.role, 'viewer') = 'editor'
    )
  );

-- DELETE policy: allow only owners or editor collaborators
CREATE POLICY IF NOT EXISTS "trip_places_delete_owner_or_editor" ON public.trip_places
  FOR DELETE
  USING (
    trip_id IN (
      SELECT t.id FROM public.trips t
      WHERE t.owner_id = auth.uid() OR t.user_id = auth.uid()
      UNION
      SELECT tc.trip_id FROM public.trip_collaborators tc
      WHERE tc.user_id = auth.uid()
        AND coalesce(tc.status, 'active') = 'active'
        AND coalesce(tc.role, 'viewer') = 'editor'
    )
  );

-- Notes:
-- - Viewers retain read-only access via SELECT policy above
-- - Owners are matched by either owner_id (new) or user_id (legacy) for compatibility
-- - Collaborators must be active and role='editor' to write
