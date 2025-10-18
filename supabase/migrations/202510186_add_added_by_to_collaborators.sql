-- Add added_by column to trip_collaborators table
-- This column tracks who added each collaborator to the trip

ALTER TABLE public.trip_collaborators 
ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_trip_collab_added_by ON public.trip_collaborators(added_by);

-- Add comment for documentation
COMMENT ON COLUMN public.trip_collaborators.added_by IS 'User who added this collaborator (inviter or trip owner)';
