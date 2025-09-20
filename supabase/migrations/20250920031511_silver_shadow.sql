/*
  # Add route_cache table and summary column

  1. New Tables
    - `route_cache`
      - `trip_id` (uuid, foreign key to trips)
      - `day` (text, ISO date)
      - `places` (jsonb, ordered places for the day)
      - `summary` (jsonb, metrics and metadata)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `route_cache` table
    - Add policies for trip owners and collaborators
*/

-- Create route_cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.route_cache (
  trip_id uuid NOT NULL,
  day text NOT NULL,
  places jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (trip_id, day)
);

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'route_cache_trip_id_fkey'
  ) THEN
    ALTER TABLE public.route_cache 
    ADD CONSTRAINT route_cache_trip_id_fkey 
    FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.route_cache ENABLE ROW LEVEL SECURITY;

-- Policy for trip owners
CREATE POLICY IF NOT EXISTS "Trip owners can manage route cache"
  ON public.route_cache
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM public.trips WHERE owner_id = auth.uid()
    )
  );

-- Policy for trip collaborators
CREATE POLICY IF NOT EXISTS "Trip collaborators can view route cache"
  ON public.route_cache
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_collaborators WHERE user_id = auth.uid()
    )
  );