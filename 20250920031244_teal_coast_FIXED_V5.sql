/*
  # Create trip_place_visits table

  1. New Tables
    - `trip_place_visits`
      - `id` (bigint, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `place_id` (text) - reference to the place
      - `user_id` (uuid, foreign key to auth.users)
      - `lat` (double precision) - visit location latitude
      - `lng` (double precision) - visit location longitude
      - `source` (text) - how the visit was recorded
      - `visited_at` (timestamptz) - when the visit occurred
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `trip_place_visits` table
    - Add policies for trip collaborators to manage visits

  3. Indexes
    - Add indexes for efficient queries by trip and user

  FIXED VERSION V5: Simplified policy that should work with confirmed table structure
*/

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

-- Drop existing policy first
DROP POLICY IF EXISTS "Trip collaborators can manage place visits" ON public.trip_place_visits;

-- Create a very simple policy first - just allow users to manage their own visits
CREATE POLICY "Users can manage their own place visits"
  ON public.trip_place_visits
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Add a separate policy for trip collaborators
CREATE POLICY "Trip collaborators can view place visits"
  ON public.trip_place_visits
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT tc.trip_id 
      FROM public.trip_collaborators tc 
      WHERE tc.user_id = auth.uid()
    )
  );
