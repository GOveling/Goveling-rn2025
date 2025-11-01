-- ============================================================================
-- MIGRATION: Populate country_code for ALL countries (30 countries total)
-- ============================================================================
-- This migration populates the country_code column for existing trip_places
-- using GPS coordinates for ALL countries defined in CountryDetectionService.
-- Only updates places where country_code IS NULL (safe for existing data).
-- ============================================================================

BEGIN;

-- América del Sur (8 países)
-- Chile
UPDATE public.trip_places
SET country_code = 'CL'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN -56.0 AND -17.5
  AND lng BETWEEN -109.5 AND -66.4;

-- Argentina
UPDATE public.trip_places
SET country_code = 'AR'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN -55.0 AND -21.8
  AND lng BETWEEN -73.6 AND -53.6;

-- Brasil
UPDATE public.trip_places
SET country_code = 'BR'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN -33.7 AND 5.3
  AND lng BETWEEN -73.9 AND -28.8;

-- Perú
UPDATE public.trip_places
SET country_code = 'PE'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN -18.4 AND 0.0
  AND lng BETWEEN -81.4 AND -68.7;

-- Colombia
UPDATE public.trip_places
SET country_code = 'CO'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN -4.2 AND 12.5
  AND lng BETWEEN -79.0 AND -66.9;

-- Ecuador
UPDATE public.trip_places
SET country_code = 'EC'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN -5.0 AND 1.5
  AND lng BETWEEN -92.0 AND -75.2;

-- Bolivia
UPDATE public.trip_places
SET country_code = 'BO'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN -22.9 AND -9.7
  AND lng BETWEEN -69.6 AND -57.5;

-- Uruguay
UPDATE public.trip_places
SET country_code = 'UY'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN -35.0 AND -30.0
  AND lng BETWEEN -58.5 AND -53.1;

-- América del Norte y Central (4 países)
-- Estados Unidos
UPDATE public.trip_places
SET country_code = 'US'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 24.5 AND 49.4
  AND lng BETWEEN -125.0 AND -66.9;

-- México
UPDATE public.trip_places
SET country_code = 'MX'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 14.5 AND 32.7
  AND lng BETWEEN -118.4 AND -86.7;

-- Canadá
UPDATE public.trip_places
SET country_code = 'CA'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 41.7 AND 83.1
  AND lng BETWEEN -141.0 AND -52.6;

-- Panamá
UPDATE public.trip_places
SET country_code = 'PA'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 7.2 AND 9.6
  AND lng BETWEEN -83.0 AND -77.2;

-- Costa Rica
UPDATE public.trip_places
SET country_code = 'CR'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 8.0 AND 11.2
  AND lng BETWEEN -85.9 AND -82.5;

-- Europa (7 países)
-- España
UPDATE public.trip_places
SET country_code = 'ES'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 36.0 AND 43.8
  AND lng BETWEEN -9.3 AND 3.3;

-- Francia
UPDATE public.trip_places
SET country_code = 'FR'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 42.3 AND 51.1
  AND lng BETWEEN -5.1 AND 9.6;

-- Italia
UPDATE public.trip_places
SET country_code = 'IT'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 36.6 AND 47.1
  AND lng BETWEEN 6.6 AND 18.5;

-- Alemania
UPDATE public.trip_places
SET country_code = 'DE'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 47.3 AND 55.1
  AND lng BETWEEN 5.9 AND 15.0;

-- Reino Unido
UPDATE public.trip_places
SET country_code = 'GB'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 49.9 AND 60.9
  AND lng BETWEEN -8.2 AND 1.8;

-- Portugal
UPDATE public.trip_places
SET country_code = 'PT'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 36.9 AND 42.2
  AND lng BETWEEN -9.5 AND -6.2;

-- Grecia
UPDATE public.trip_places
SET country_code = 'GR'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 34.8 AND 41.7
  AND lng BETWEEN 19.4 AND 28.2;

-- Asia (4 países)
-- Japón
UPDATE public.trip_places
SET country_code = 'JP'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 24.0 AND 45.5
  AND lng BETWEEN 122.9 AND 153.9;

-- China
UPDATE public.trip_places
SET country_code = 'CN'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 18.2 AND 53.6
  AND lng BETWEEN 73.5 AND 135.1;

-- Tailandia
UPDATE public.trip_places
SET country_code = 'TH'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 5.6 AND 20.5
  AND lng BETWEEN 97.3 AND 105.6;

-- India
UPDATE public.trip_places
SET country_code = 'IN'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 8.1 AND 35.5
  AND lng BETWEEN 68.2 AND 97.4;

-- Oceanía (2 países)
-- Australia
UPDATE public.trip_places
SET country_code = 'AU'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN -43.6 AND -10.7
  AND lng BETWEEN 113.3 AND 153.6;

-- Nueva Zelanda
UPDATE public.trip_places
SET country_code = 'NZ'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN -47.3 AND -34.4
  AND lng BETWEEN 166.4 AND 178.6;

-- África (3 países)
-- Sudáfrica
UPDATE public.trip_places
SET country_code = 'ZA'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN -34.8 AND -22.1
  AND lng BETWEEN 16.5 AND 32.9;

-- Egipto
UPDATE public.trip_places
SET country_code = 'EG'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN 22.0 AND 31.7
  AND lng BETWEEN 25.0 AND 36.9;

-- Kenia
UPDATE public.trip_places
SET country_code = 'KE'
WHERE country_code IS NULL
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN -4.7 AND 5.0
  AND lng BETWEEN 33.9 AND 41.9;

-- Log results
DO $$
DECLARE
  updated_count INTEGER;
  remaining_null INTEGER;
BEGIN
  -- Count updated places (all that now have country_code)
  SELECT COUNT(*) INTO updated_count
  FROM public.trip_places
  WHERE country_code IS NOT NULL;
  
  -- Count remaining NULL places
  SELECT COUNT(*) INTO remaining_null
  FROM public.trip_places
  WHERE country_code IS NULL AND lat IS NOT NULL AND lng IS NOT NULL;
  
  RAISE NOTICE '✅ Migration complete!';
  RAISE NOTICE '📊 Total places with country_code: %', updated_count;
  RAISE NOTICE '⚠️  Places still without country_code: %', remaining_null;
  RAISE NOTICE 'ℹ️  Remaining NULL places may be in countries not yet defined in CountryDetectionService';
END $$;

COMMIT;
