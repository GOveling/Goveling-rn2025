/*
  # Create directions_cache table

  1. New Tables
    - `directions_cache`
      - `id` (bigint, primary key)
      - `o_lat` (double precision) - origin latitude
      - `o_lng` (double precision) - origin longitude  
      - `d_lat` (double precision) - destination latitude
      - `d_lng` (double precision) - destination longitude
      - `mode` (text) - travel mode (walking, driving, bicycling, transit)
      - `payload` (jsonb) - cached directions response
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `directions_cache` table
    - Add policy for authenticated users to read/write their cached directions

  3. Indexes
    - Add composite index for efficient cache lookups
*/

CREATE TABLE IF NOT EXISTS public.directions_cache (
  id bigserial PRIMARY KEY,
  o_lat double precision NOT NULL,
  o_lng double precision NOT NULL,
  d_lat double precision NOT NULL,
  d_lng double precision NOT NULL,
  mode text NOT NULL CHECK (mode IN ('walking', 'driving', 'bicycling', 'transit')),
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient cache lookups
CREATE INDEX IF NOT EXISTS idx_dircache_key 
  ON public.directions_cache (mode, o_lat, o_lng, d_lat, d_lng);

-- Enable RLS
ALTER TABLE public.directions_cache ENABLE ROW LEVEL SECURITY;

-- Add policy for authenticated users (directions cache is shared)
CREATE POLICY "Authenticated users can access directions cache"
  ON public.directions_cache
  FOR ALL
  TO authenticated
  USING (true);