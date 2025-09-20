/*
  # Add trip_place_visits table for tracking visited places

  1. New Tables
    - `trip_place_visits`
      - `id` (bigint, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `place_id` (text, place identifier)
      - `user_id` (uuid, foreign key to auth.users)
      - `lat` (double precision, coordinates)
      - `lng` (double precision, coordinates)
      - `source` (text, how the visit was recorded)
      - `visited_at` (timestamp)

  2. Security
    - Enable RLS on `trip_place_visits` table
    - Add policies for trip participants
*/

-- Create trip_place_visits table
CREATE TABLE IF NOT EXISTS public.trip_place_visits (
  id bigserial PRIMARY KEY,
  trip_id uuid NOT NULL,
  place_id text NOT NULL,
  user_id uuid DEFAULT auth.uid(),
  lat double precision,
  lng double precision,
  source text DEFAULT 'manual',
  visited_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
DO $$ 
BEGIN
  -- Foreign key to trips
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trip_place_visits_trip_id_fkey'
  ) THEN
    ALTER TABLE public.trip_place_visits 
    ADD CONSTRAINT trip_place_visits_trip_id_fkey 
    FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;
  END IF;

  -- Foreign key to users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trip_place_visits_user_id_fkey'
  ) THEN
    ALTER TABLE public.trip_place_visits 
    ADD CONSTRAINT trip_place_visits_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trip_place_visits_trip_id ON public.trip_place_visits(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_place_visits_user_id ON public.trip_place_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_place_visits_place_id ON public.trip_place_visits(place_id);

-- Enable RLS
ALTER TABLE public.trip_place_visits ENABLE ROW LEVEL SECURITY;

-- Policy for trip owners and collaborators
CREATE POLICY IF NOT EXISTS "Trip participants can manage visits"
  ON public.trip_place_visits
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM public.trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM public.trip_collaborators WHERE user_id = auth.uid()
    )
  );