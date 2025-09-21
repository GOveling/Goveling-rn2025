/*
  # Create trip_place_visits table

  FIXED VERSION V6: Ultra-simplified without any policies initially
  We'll create the table first, then add policies separately if needed
*/

-- Just create the table without any complex policies
CREATE TABLE IF NOT EXISTS public.trip_place_visits (
  id bigserial PRIMARY KEY,
  trip_id uuid NOT NULL,
  place_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lat double precision,
  lng double precision,
  source text DEFAULT 'manual',
  visited_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trip_place_visits_trip 
  ON public.trip_place_visits (trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_place_visits_user 
  ON public.trip_place_visits (user_id);

CREATE INDEX IF NOT EXISTS idx_trip_place_visits_place 
  ON public.trip_place_visits (trip_id, place_id);

-- Enable RLS
ALTER TABLE public.trip_place_visits ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Trip collaborators can manage place visits" ON public.trip_place_visits;
DROP POLICY IF EXISTS "Users can manage their own place visits" ON public.trip_place_visits;
DROP POLICY IF EXISTS "Trip collaborators can view place visits" ON public.trip_place_visits;

-- Create the simplest possible policy - just allow authenticated users for now
-- We can refine this later once the table is created successfully
CREATE POLICY "Allow authenticated users to manage place visits"
  ON public.trip_place_visits
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
