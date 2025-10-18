-- Add photo_url column to trip_places table
ALTER TABLE trip_places 
ADD COLUMN photo_url TEXT;

-- Add comment to the column
COMMENT ON COLUMN trip_places.photo_url IS 'URL of the first photo from the place (if available)';
