-- =====================================================
-- ADD country_code to global_places for geographic filtering
-- This migration adds the missing column needed for social feed
-- =====================================================

-- Add country_code column to global_places if it doesn't exist
ALTER TABLE global_places 
ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_global_places_country_code 
ON global_places(country_code);

-- Add comment
COMMENT ON COLUMN global_places.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., US, CL, FR)';

-- Optional: Populate country_code from existing data if you have it
-- You can run this later to populate the column:
-- UPDATE global_places SET country_code = 'XX' WHERE country_code IS NULL;
