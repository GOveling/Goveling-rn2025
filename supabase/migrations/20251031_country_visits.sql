-- Migration: Country Visits Table
-- Purpose: Track user's country visits with anti-duplicate logic
-- Date: 2025-10-31

-- Create country_visits table
CREATE TABLE IF NOT EXISTS public.country_visits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_return BOOLEAN DEFAULT FALSE,
  places_count INT DEFAULT 0,
  previous_country_code TEXT, -- Para tracking de flujo de viaje
  CONSTRAINT country_code_length CHECK (char_length(country_code) = 2)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_country_visits_user ON public.country_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_country_visits_trip ON public.country_visits(trip_id);
CREATE INDEX IF NOT EXISTS idx_country_visits_country_code ON public.country_visits(country_code);
CREATE INDEX IF NOT EXISTS idx_country_visits_entry_date ON public.country_visits(entry_date DESC);

-- Composite index for anti-duplicate queries
CREATE INDEX IF NOT EXISTS idx_country_visits_user_date ON public.country_visits(user_id, entry_date DESC);

-- Enable RLS
ALTER TABLE public.country_visits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own country visits" ON public.country_visits;
DROP POLICY IF EXISTS "Users can view their own country visits" ON public.country_visits;
DROP POLICY IF EXISTS "Users can update their own country visits" ON public.country_visits;
DROP POLICY IF EXISTS "Users can delete their own country visits" ON public.country_visits;

-- RLS Policies
CREATE POLICY "Users can insert their own country visits"
  ON public.country_visits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own country visits"
  ON public.country_visits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own country visits"
  ON public.country_visits
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own country visits"
  ON public.country_visits
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to check if country should be added (anti-duplicate logic)
CREATE OR REPLACE FUNCTION public.should_add_country_visit(
  p_user_id UUID,
  p_country_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  last_visit RECORD;
BEGIN
  -- Get the last country visit for this user
  SELECT country_code, entry_date
  INTO last_visit
  FROM public.country_visits
  WHERE user_id = p_user_id
  ORDER BY entry_date DESC
  LIMIT 1;

  -- If no previous visits, always add
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- If last visit was to the same country, don't add (still in same country)
  IF last_visit.country_code = p_country_code THEN
    RETURN FALSE;
  END IF;

  -- If last visit was to a different country, add (user left and entered new country)
  RETURN TRUE;
END;
$$;

-- Function to get country visit count for user
CREATE OR REPLACE FUNCTION public.get_country_visit_count(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  visit_count INT;
BEGIN
  SELECT COUNT(*)
  INTO visit_count
  FROM public.country_visits
  WHERE user_id = p_user_id;

  RETURN COALESCE(visit_count, 0);
END;
$$;

-- Function to get unique country count (distinct countries visited)
CREATE OR REPLACE FUNCTION public.get_unique_countries_count(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  unique_count INT;
BEGIN
  SELECT COUNT(DISTINCT country_code)
  INTO unique_count
  FROM public.country_visits
  WHERE user_id = p_user_id;

  RETURN COALESCE(unique_count, 0);
END;
$$;

-- Trigger to update travel_stats when country is added
CREATE OR REPLACE FUNCTION public.update_country_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the countries_count in travel_stats
  UPDATE public.travel_stats
  SET countries_count = (
    SELECT COUNT(DISTINCT country_code)
    FROM public.country_visits
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
  ),
  last_updated = NOW()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  -- Insert if not exists
  INSERT INTO public.travel_stats (user_id, countries_count, cities_count, places_count)
  SELECT COALESCE(NEW.user_id, OLD.user_id), 
         (SELECT COUNT(DISTINCT country_code) FROM public.country_visits WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)),
         0,
         0
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_country_visit_stats ON public.country_visits;
CREATE TRIGGER trg_country_visit_stats
  AFTER INSERT OR DELETE
  ON public.country_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_country_stats();
