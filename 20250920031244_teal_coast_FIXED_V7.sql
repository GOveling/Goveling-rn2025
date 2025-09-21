/*
  # Create trip_place_visits table - MINIMAL VERSION

  FIXED VERSION V7: Step by step creation to identify the exact problem
*/

-- Step 1: Create table without any constraints or references
CREATE TABLE IF NOT EXISTS public.trip_place_visits (
  id bigserial PRIMARY KEY,
  trip_id uuid NOT NULL,
  place_id text NOT NULL,
  user_id uuid, -- No foreign key constraint initially
  lat double precision,
  lng double precision,
  source text DEFAULT 'manual',
  visited_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Step 2: Create basic indexes
CREATE INDEX IF NOT EXISTS idx_trip_place_visits_trip 
  ON public.trip_place_visits (trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_place_visits_user 
  ON public.trip_place_visits (user_id);

CREATE INDEX IF NOT EXISTS idx_trip_place_visits_place 
  ON public.trip_place_visits (trip_id, place_id);

-- Step 3: Enable RLS
ALTER TABLE public.trip_place_visits ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop any existing policies
DROP POLICY IF EXISTS "Trip collaborators can manage place visits" ON public.trip_place_visits;
DROP POLICY IF EXISTS "Users can manage their own place visits" ON public.trip_place_visits;
DROP POLICY IF EXISTS "Trip collaborators can view place visits" ON public.trip_place_visits;
DROP POLICY IF EXISTS "Allow authenticated users to manage place visits" ON public.trip_place_visits;

-- Step 5: Don't create any policy yet, just leave RLS enabled
-- This will block all access, but the table should be created successfully

-- Success message
SELECT 'trip_place_visits table created successfully!' as result;
