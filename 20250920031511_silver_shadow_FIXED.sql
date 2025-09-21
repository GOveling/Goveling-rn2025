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

  FIXED VERSION: Remove references to non-existent trips table
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

-- Skip foreign key constraint since trips table doesn't exist
-- We can add it later when trips table is created

-- Enable RLS
ALTER TABLE public.route_cache ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Trip owners can manage route cache" ON public.route_cache;
DROP POLICY IF EXISTS "Trip collaborators can view route cache" ON public.route_cache;

-- Policy for trip collaborators (only available table we have)
CREATE POLICY "Trip collaborators can manage route cache"
  ON public.route_cache
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT tc.trip_id FROM public.trip_collaborators tc WHERE tc.user_id = auth.uid()
    )
  );

-- Success message
SELECT 'route_cache table created successfully!' as result;
