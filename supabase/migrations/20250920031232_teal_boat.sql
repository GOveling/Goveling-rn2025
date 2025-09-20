/*
  # Add summary column to route_cache table

  1. Changes
    - Add summary jsonb column to route_cache table (if it exists)
    - Create route_cache table if it doesn't exist first

  2. Notes
    - This migration ensures route_cache table exists before adding the summary column
    - The summary column will store per-day metrics, version info, and timeline data
*/

-- First, create the route_cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.route_cache (
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day date NOT NULL,
  places jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (trip_id, day)
);

-- Enable RLS on route_cache table
ALTER TABLE public.route_cache ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for route_cache
CREATE POLICY "Users can manage route cache for their trips"
  ON public.route_cache
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM public.trip_collaborators 
      WHERE user_id = auth.uid()
    )
  );

-- Now add the summary column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'route_cache' 
    AND column_name = 'summary'
  ) THEN
    ALTER TABLE public.route_cache ADD COLUMN summary jsonb;
  END IF;
END $$;