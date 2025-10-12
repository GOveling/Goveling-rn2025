-- Migration: Add country_code field to trip_places table
-- Date: 2025-12-09
-- Purpose: Enable country badge functionality in trip cards

-- Add country_code column to trip_places table
ALTER TABLE public.trip_places 
ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Add country column for human-readable country name
ALTER TABLE public.trip_places 
ADD COLUMN IF NOT EXISTS country TEXT;

-- Add city column for city information
ALTER TABLE public.trip_places 
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add full_address column for complete address
ALTER TABLE public.trip_places 
ADD COLUMN IF NOT EXISTS full_address TEXT;

-- Add index for country_code for better performance
CREATE INDEX IF NOT EXISTS idx_trip_places_country_code ON public.trip_places(country_code);

-- Add comments for documentation
COMMENT ON COLUMN public.trip_places.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., MX, US, CA)';
COMMENT ON COLUMN public.trip_places.country IS 'Human-readable country name';
COMMENT ON COLUMN public.trip_places.city IS 'City name where the place is located';
COMMENT ON COLUMN public.trip_places.full_address IS 'Complete formatted address from Google Places API';