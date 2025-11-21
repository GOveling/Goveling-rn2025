-- Migration: Populate country_code for existing global_places
-- Date: 2025-11-21
-- Purpose: Set country_code based on coordinates for existing places

-- Update places in Chile
UPDATE public.global_places
SET country_code = 'CL'
WHERE country_code IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN -56.0 AND -17.5
  AND longitude BETWEEN -109.5 AND -66.4;

-- Update places in Argentina
UPDATE public.global_places
SET country_code = 'AR'
WHERE country_code IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN -55.0 AND -21.8
  AND longitude BETWEEN -73.6 AND -53.6;

-- Update places in Brazil
UPDATE public.global_places
SET country_code = 'BR'
WHERE country_code IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN -33.7 AND 5.3
  AND longitude BETWEEN -73.9 AND -28.8;

-- Update places in Peru
UPDATE public.global_places
SET country_code = 'PE'
WHERE country_code IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN -18.4 AND -0.1
  AND longitude BETWEEN -81.4 AND -68.6;

-- Update places in United States
UPDATE public.global_places
SET country_code = 'US'
WHERE country_code IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN 24.5 AND 49.4
  AND longitude BETWEEN -125.0 AND -66.9;

-- Update places in Mexico
UPDATE public.global_places
SET country_code = 'MX'
WHERE country_code IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN 14.5 AND 32.7
  AND longitude BETWEEN -118.4 AND -86.7;

-- Update places in Spain
UPDATE public.global_places
SET country_code = 'ES'
WHERE country_code IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN 36.0 AND 43.8
  AND longitude BETWEEN -9.3 AND 3.3;

-- Update places in France
UPDATE public.global_places
SET country_code = 'FR'
WHERE country_code IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN 41.3 AND 51.1
  AND longitude BETWEEN -5.1 AND 9.6;

-- Update places in Italy
UPDATE public.global_places
SET country_code = 'IT'
WHERE country_code IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN 36.6 AND 47.1
  AND longitude BETWEEN 6.6 AND 18.5;

-- Update places in United Kingdom
UPDATE public.global_places
SET country_code = 'GB'
WHERE country_code IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN 49.9 AND 60.9
  AND longitude BETWEEN -8.2 AND 1.8;

-- Update places in Germany
UPDATE public.global_places
SET country_code = 'DE'
WHERE country_code IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN 47.3 AND 55.1
  AND longitude BETWEEN 5.9 AND 15.0;

-- Update places in Japan
UPDATE public.global_places
SET country_code = 'JP'
WHERE country_code IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN 24.0 AND 45.5
  AND longitude BETWEEN 122.9 AND 153.0;

-- Update places in Australia
UPDATE public.global_places
SET country_code = 'AU'
WHERE country_code IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN -43.6 AND -10.7
  AND longitude BETWEEN 113.3 AND 153.6;

-- Update places in Canada
UPDATE public.global_places
SET country_code = 'CA'
WHERE country_code IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN 41.7 AND 83.1
  AND longitude BETWEEN -141.0 AND -52.6;

-- Log results
DO $$
DECLARE
  updated_count INTEGER;
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM public.global_places WHERE country_code IS NOT NULL;
  SELECT COUNT(*) INTO null_count FROM public.global_places WHERE country_code IS NULL AND latitude IS NOT NULL;
  
  RAISE NOTICE 'Migration completed:';
  RAISE NOTICE '  - Places with country_code: %', updated_count;
  RAISE NOTICE '  - Places still without country_code: %', null_count;
END $$;
