-- Migration: Create trip_places table for storing places added to trips
-- Date: 2025-10-09

-- Create trip_places table
CREATE TABLE IF NOT EXISTS trip_places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL, -- Google Places API place_id
  name TEXT NOT NULL,
  address TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  category TEXT,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  visited BOOLEAN DEFAULT FALSE,
  visit_date TIMESTAMP WITH TIME ZONE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trip_places_trip_id ON trip_places(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_places_place_id ON trip_places(place_id);
CREATE INDEX IF NOT EXISTS idx_trip_places_added_by ON trip_places(added_by);
CREATE INDEX IF NOT EXISTS idx_trip_places_added_at ON trip_places(added_at);

-- Create unique constraint to prevent duplicate places in the same trip
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_places_unique 
ON trip_places(trip_id, place_id);

-- Enable RLS (Row Level Security)
ALTER TABLE trip_places ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Policy: Users can view trip places if they own the trip or are collaborators
CREATE POLICY "Users can view trip places they have access to" ON trip_places
  FOR SELECT 
  USING (
    trip_id IN (
      SELECT t.id FROM trips t 
      WHERE t.owner_id = auth.uid()
      UNION
      SELECT tc.trip_id FROM trip_collaborators tc 
      WHERE tc.user_id = auth.uid()
    )
  );

-- Policy: Users can insert trip places to trips they own or collaborate on
CREATE POLICY "Users can add places to trips they have access to" ON trip_places
  FOR INSERT 
  WITH CHECK (
    trip_id IN (
      SELECT t.id FROM trips t 
      WHERE t.owner_id = auth.uid()
      UNION
      SELECT tc.trip_id FROM trip_collaborators tc 
      WHERE tc.user_id = auth.uid()
    )
  );

-- Policy: Users can update trip places in trips they own or collaborate on
CREATE POLICY "Users can update trip places they have access to" ON trip_places
  FOR UPDATE 
  USING (
    trip_id IN (
      SELECT t.id FROM trips t 
      WHERE t.owner_id = auth.uid()
      UNION
      SELECT tc.trip_id FROM trip_collaborators tc 
      WHERE tc.user_id = auth.uid()
    )
  );

-- Policy: Users can delete trip places in trips they own or collaborate on
CREATE POLICY "Users can delete trip places they have access to" ON trip_places
  FOR DELETE 
  USING (
    trip_id IN (
      SELECT t.id FROM trips t 
      WHERE t.owner_id = auth.uid()
      UNION
      SELECT tc.trip_id FROM trip_collaborators tc 
      WHERE tc.user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trip_places_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trip_places_updated_at
  BEFORE UPDATE ON trip_places
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_places_updated_at();

-- Add comment to table
COMMENT ON TABLE trip_places IS 'Stores places/locations added to specific trips by users';
