--
-- Eliminate RLS recursion involving trips <-> trip_collaborators
-- Strategy: Make trip_collaborators policies depend only on its own columns
-- (user_id, added_by), not on trips. Backfill added_by to owner_id for existing rows.
-- Then trips policies can safely reference trip_collaborators for collaborator reads
-- without creating cycles.
--

-- Ensure column exists
ALTER TABLE public.trip_collaborators 
  ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill added_by to the trip owner for all existing rows where it's NULL
UPDATE public.trip_collaborators tc
SET added_by = t.owner_id
FROM public.trips t
WHERE t.id = tc.trip_id
  AND tc.added_by IS NULL
  AND t.owner_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
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
  -- Also drop older names if present
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trip_collaborators' AND policyname='collaborators_select_own') THEN
    DROP POLICY "collaborators_select_own" ON public.trip_collaborators;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trip_collaborators' AND policyname='collaborators_insert_owner') THEN
    DROP POLICY "collaborators_insert_owner" ON public.trip_collaborators;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trip_collaborators' AND policyname='collaborators_update_owner') THEN
    DROP POLICY "collaborators_update_owner" ON public.trip_collaborators;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trip_collaborators' AND policyname='collaborators_delete_owner') THEN
    DROP POLICY "collaborators_delete_owner" ON public.trip_collaborators;
  END IF;
END $$;

-- New non-recursive policies for trip_collaborators
-- SELECT: user can read their own row, and the owner (added_by) can read all rows they added
CREATE POLICY trip_collaborators_select_self_or_adder
  ON public.trip_collaborators
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR added_by = auth.uid()
  );

-- INSERT: only the owner (adder) can add rows; require added_by = auth.uid()
CREATE POLICY trip_collaborators_insert_by_owner
  ON public.trip_collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    added_by = auth.uid()
  );

-- UPDATE: only the owner (adder) can update rows
CREATE POLICY trip_collaborators_update_by_owner
  ON public.trip_collaborators
  FOR UPDATE
  TO authenticated
  USING (
    added_by = auth.uid()
  );

-- DELETE: only the owner (adder) can delete rows
CREATE POLICY trip_collaborators_delete_by_owner
  ON public.trip_collaborators
  FOR DELETE
  TO authenticated
  USING (
    added_by = auth.uid()
  );

-- Optional hardening: If you later enforce owner-only invitations at the RPC layer,
-- this aligns perfectly because inv.inviter_id will equal trips.owner_id and be stored
-- as added_by on acceptance.
