-- Migration: Add missing columns to trip_places table
-- Date: 2025-11-01
-- Purpose: Add type, city, address, and country_code columns for better place information

-- Add type column (alias for category, more semantic)
ALTER TABLE public.trip_places 
ADD COLUMN IF NOT EXISTS type TEXT;

-- Add city column for place city information
ALTER TABLE public.trip_places 
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add address column if not exists
ALTER TABLE public.trip_places 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add country_code column (ISO 2-letter code)
ALTER TABLE public.trip_places 
ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Add constraint to ensure country_code is uppercase and 2 characters
-- (Using DO block to make it idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'country_code_format' 
    AND conrelid = 'public.trip_places'::regclass
  ) THEN
    ALTER TABLE public.trip_places 
    ADD CONSTRAINT country_code_format 
    CHECK (country_code IS NULL OR (country_code = UPPER(country_code) AND char_length(country_code) = 2));
  END IF;
END $$;

-- Create indexes for fast searches
CREATE INDEX IF NOT EXISTS idx_trip_places_city ON public.trip_places(city);
CREATE INDEX IF NOT EXISTS idx_trip_places_type ON public.trip_places(type);
CREATE INDEX IF NOT EXISTS idx_trip_places_country_code ON public.trip_places(country_code);

-- Comment on columns
COMMENT ON COLUMN public.trip_places.type IS 'Type/category of place (restaurant, hotel, museum, etc.)';
COMMENT ON COLUMN public.trip_places.city IS 'City where the place is located';
COMMENT ON COLUMN public.trip_places.address IS 'Full address of the place';
COMMENT ON COLUMN public.trip_places.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., CL, US, AR)';
