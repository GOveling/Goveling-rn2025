-- Migration: Populate country_code for existing trip_places
-- Date: 2025-11-01
-- Purpose: Set country_code based on coordinates for existing places

-- Update places in Chile
UPDATE public.trip_places
SET country_code = 'CL'
WHERE country_code IS NULL
  AND lat IS NOT NULL
  AND lng IS NOT NULL
  AND lat BETWEEN -56.0 AND -17.5
  AND lng BETWEEN -109.5 AND -66.4;

-- Update places in Argentina
UPDATE public.trip_places
SET country_code = 'AR'
WHERE country_code IS NULL
  AND lat IS NOT NULL
  AND lng IS NOT NULL
  AND lat BETWEEN -55.0 AND -21.8
  AND lng BETWEEN -73.6 AND -53.6;

-- Update places in Brazil
UPDATE public.trip_places
SET country_code = 'BR'
WHERE country_code IS NULL
  AND lat IS NOT NULL
  AND lng IS NOT NULL
  AND lat BETWEEN -33.7 AND 5.3
  AND lng BETWEEN -73.9 AND -28.8;

-- Update places in Peru
UPDATE public.trip_places
SET country_code = 'PE'
WHERE country_code IS NULL
  AND lat IS NOT NULL
  AND lng IS NOT NULL
  AND lat BETWEEN -18.4 AND -0.1
  AND lng BETWEEN -81.4 AND -68.6;

-- Update places in United States
UPDATE public.trip_places
SET country_code = 'US'
WHERE country_code IS NULL
  AND lat IS NOT NULL
  AND lng IS NOT NULL
  AND lat BETWEEN 24.5 AND 49.4
  AND lng BETWEEN -125.0 AND -66.9;

-- Update places in Mexico
UPDATE public.trip_places
SET country_code = 'MX'
WHERE country_code IS NULL
  AND lat IS NOT NULL
  AND lng IS NOT NULL
  AND lat BETWEEN 14.5 AND 32.7
  AND lng BETWEEN -118.4 AND -86.7;

-- Update places in Spain
UPDATE public.trip_places
SET country_code = 'ES'
WHERE country_code IS NULL
  AND lat IS NOT NULL
  AND lng IS NOT NULL
  AND lat BETWEEN 36.0 AND 43.8
  AND lng BETWEEN -9.3 AND 3.3;

-- Update places in France
UPDATE public.trip_places
SET country_code = 'FR'
WHERE country_code IS NULL
  AND lat IS NOT NULL
  AND lng IS NOT NULL
  AND lat BETWEEN 41.3 AND 51.1
  AND lng BETWEEN -5.1 AND 9.6;

-- Update places in Italy
UPDATE public.trip_places
SET country_code = 'IT'
WHERE country_code IS NULL
  AND lat IS NOT NULL
  AND lng IS NOT NULL
  AND lat BETWEEN 36.6 AND 47.1
  AND lng BETWEEN 6.6 AND 18.5;

-- Add more countries as needed...

-- Log results
DO $$
DECLARE
  updated_count INTEGER;
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM public.trip_places WHERE country_code IS NOT NULL;
  SELECT COUNT(*) INTO null_count FROM public.trip_places WHERE country_code IS NULL AND lat IS NOT NULL;
  
  RAISE NOTICE 'Migration completed:';
  RAISE NOTICE '  - Places with country_code: %', updated_count;
  RAISE NOTICE '  - Places still without country_code: %', null_count;
END $$;
