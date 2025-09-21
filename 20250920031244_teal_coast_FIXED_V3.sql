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

  FIXED VERSION V3: Dynamic policy creation based on actual trips table structure
*/

CREATE TABLE IF NOT EXISTS public.trip_place_visits (
  id bigserial PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
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

-- Create policy dynamically based on trips table structure
DO $$
DECLARE
    owner_column_name text;
    policy_sql text;
BEGIN
    -- Check what column exists in trips table for owner reference
    SELECT column_name INTO owner_column_name
    FROM information_schema.columns 
    WHERE table_name = 'trips' 
    AND table_schema = 'public' 
    AND column_name IN ('user_id', 'owner_id', 'created_by')
    ORDER BY CASE 
        WHEN column_name = 'user_id' THEN 1
        WHEN column_name = 'owner_id' THEN 2
        WHEN column_name = 'created_by' THEN 3
        ELSE 4
    END
    LIMIT 1;
    
    IF owner_column_name IS NULL THEN
        RAISE EXCEPTION 'No owner column found in trips table';
    END IF;
    
    RAISE NOTICE 'Using trips.% for owner reference', owner_column_name;
    
    -- Build the policy SQL dynamically
    policy_sql := format('
        CREATE POLICY "Trip collaborators can manage place visits"
        ON public.trip_place_visits
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.trips t
                WHERE t.id = trip_place_visits.trip_id
                AND t.%I = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.trip_collaborators tc
                WHERE tc.trip_id = trip_place_visits.trip_id
                AND tc.user_id = auth.uid()
            )
        )', owner_column_name);
    
    -- Execute the policy creation
    EXECUTE policy_sql;
    
    RAISE NOTICE 'Policy created successfully using column: %', owner_column_name;
END $$;
