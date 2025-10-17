-- Migration: Add Google Places API fields to trip_places table
-- Date: 2025-10-17
-- Description: Add additional fields from Google Places API (New) to store rich place information

-- Add Google Places fields to trip_places table
ALTER TABLE trip_places 
  ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2, 1) CHECK (google_rating >= 0 AND google_rating <= 5),
  ADD COLUMN IF NOT EXISTS reviews_count INTEGER,
  ADD COLUMN IF NOT EXISTS price_level INTEGER CHECK (price_level >= 0 AND price_level <= 4),
  ADD COLUMN IF NOT EXISTS editorial_summary TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comments to document the new fields
COMMENT ON COLUMN trip_places.google_rating IS 'Google Places rating (0-5 stars)';
COMMENT ON COLUMN trip_places.reviews_count IS 'Number of Google reviews';
COMMENT ON COLUMN trip_places.price_level IS 'Price level from Google Places (0-4)';
COMMENT ON COLUMN trip_places.editorial_summary IS 'Editorial summary from Google Places';
COMMENT ON COLUMN trip_places.opening_hours IS 'Opening hours data from Google Places (JSON format)';
COMMENT ON COLUMN trip_places.website IS 'Website URL from Google Places';
COMMENT ON COLUMN trip_places.phone IS 'Phone number from Google Places';
COMMENT ON COLUMN trip_places.photo_url IS 'Photo URL from Google Places';
