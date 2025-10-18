-- Migration: Add trip_accommodations table
-- Description: Table to store accommodations saved for trips

-- Create trip_accommodations table
CREATE TABLE IF NOT EXISTS public.trip_accommodations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('hotel', 'airbnb', 'resort', 'hostel', 'cabin', 'apartment')),
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  price_per_night numeric,
  rating numeric CHECK (rating >= 0 AND rating <= 5),
  amenities text[],
  contact_info jsonb,
  availability jsonb,
  photos text[],
  notes text,
  is_booked boolean DEFAULT false,
  booking_confirmation text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trip_accommodations_trip_id ON public.trip_accommodations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_accommodations_user_id ON public.trip_accommodations(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_accommodations_type ON public.trip_accommodations(type);
CREATE INDEX IF NOT EXISTS idx_trip_accommodations_created ON public.trip_accommodations(created_at);

-- Enable RLS
ALTER TABLE public.trip_accommodations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see accommodations for trips they own or are collaborators of
CREATE POLICY "Users can view trip accommodations for their trips" ON public.trip_accommodations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t 
      WHERE t.id = trip_accommodations.trip_id 
      AND t.owner_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.trip_collaborators tc 
      WHERE tc.trip_id = trip_accommodations.trip_id 
      AND tc.user_id = auth.uid()
    )
  );

-- Users can insert accommodations for trips they own or are collaborators of
CREATE POLICY "Users can insert trip accommodations for their trips" ON public.trip_accommodations
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.trips t 
        WHERE t.id = trip_id 
        AND t.owner_id = auth.uid()
      )
      OR 
      EXISTS (
        SELECT 1 FROM public.trip_collaborators tc 
        WHERE tc.trip_id = trip_accommodations.trip_id 
        AND tc.user_id = auth.uid()
      )
    )
  );

-- Users can update accommodations they created for trips they have access to
CREATE POLICY "Users can update their trip accommodations" ON public.trip_accommodations
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.trips t 
        WHERE t.id = trip_id 
        AND t.owner_id = auth.uid()
      )
      OR 
      EXISTS (
        SELECT 1 FROM public.trip_collaborators tc 
        WHERE tc.trip_id = trip_accommodations.trip_id 
        AND tc.user_id = auth.uid()
      )
    )
  );

-- Users can delete accommodations they created for trips they have access to
CREATE POLICY "Users can delete their trip accommodations" ON public.trip_accommodations
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.trips t 
        WHERE t.id = trip_id 
        AND t.owner_id = auth.uid()
      )
      OR 
      EXISTS (
        SELECT 1 FROM public.trip_collaborators tc 
        WHERE tc.trip_id = trip_accommodations.trip_id 
        AND tc.user_id = auth.uid()
      )
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trip_accommodations_updated_at 
  BEFORE UPDATE ON public.trip_accommodations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.trip_accommodations TO authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
