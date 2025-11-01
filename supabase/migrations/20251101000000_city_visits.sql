-- =====================================================
-- MIGRATION: City Visits System
-- Date: 2025-11-01
-- Description: Add city_visits table and related functions
-- =====================================================

-- 1. CREATE city_visits TABLE
CREATE TABLE IF NOT EXISTS public.city_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- City information
  city_name TEXT NOT NULL,
  state_name TEXT,
  country_code TEXT NOT NULL, -- ISO 2-letter code (e.g., 'CL', 'US')
  country_name TEXT NOT NULL,
  
  -- Visit metadata
  entry_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  
  -- Return visit detection
  is_return BOOLEAN DEFAULT FALSE,
  
  -- Saved places count in this city
  places_count INTEGER DEFAULT 0,
  
  -- Previous city context (for tracking movement)
  previous_city_name TEXT,
  previous_country_code TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_city_visits_user_id ON public.city_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_city_visits_city_name ON public.city_visits(city_name);
CREATE INDEX IF NOT EXISTS idx_city_visits_country_code ON public.city_visits(country_code);
CREATE INDEX IF NOT EXISTS idx_city_visits_entry_date ON public.city_visits(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_city_visits_user_city_country 
  ON public.city_visits(user_id, city_name, country_code);

-- 3. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.city_visits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own city visits
CREATE POLICY "Users can view own city visits"
  ON public.city_visits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own city visits
CREATE POLICY "Users can insert own city visits"
  ON public.city_visits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own city visits
CREATE POLICY "Users can update own city visits"
  ON public.city_visits
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own city visits
CREATE POLICY "Users can delete own city visits"
  ON public.city_visits
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. FUNCTION: Check if city visit should be added
-- Returns TRUE if:
-- - No previous visit to this city, OR
-- - Last visit to this city was > 6 hours ago
CREATE OR REPLACE FUNCTION public.should_add_city_visit(
  p_user_id UUID,
  p_city_name TEXT,
  p_country_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_visit TIMESTAMP WITH TIME ZONE;
  v_hours_elapsed DOUBLE PRECISION;
BEGIN
  -- Get the most recent visit to this specific city
  SELECT entry_date INTO v_last_visit
  FROM public.city_visits
  WHERE user_id = p_user_id
    AND city_name = p_city_name
    AND country_code = p_country_code
  ORDER BY entry_date DESC
  LIMIT 1;

  -- If no previous visit, allow
  IF v_last_visit IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Calculate hours elapsed since last visit
  v_hours_elapsed := EXTRACT(EPOCH FROM (NOW() - v_last_visit)) / 3600;

  -- Allow if more than 6 hours have passed
  RETURN v_hours_elapsed >= 6;
END;
$$;

-- 5. FUNCTION: Update cities_count in travel_stats
CREATE OR REPLACE FUNCTION public.update_cities_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update cities_count for the user
  -- Count distinct cities (city_name + country_code combination)
  UPDATE public.travel_stats
  SET cities_count = (
    SELECT COUNT(DISTINCT (city_name || '|' || country_code))
    FROM public.city_visits
    WHERE user_id = NEW.user_id
  )
  WHERE user_id = NEW.user_id;

  -- If travel_stats doesn't exist for user, create it
  IF NOT FOUND THEN
    INSERT INTO public.travel_stats (user_id, cities_count)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET cities_count = EXCLUDED.cities_count;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. CREATE TRIGGER: Auto-update cities_count on INSERT
DROP TRIGGER IF EXISTS trigger_update_cities_count ON public.city_visits;
CREATE TRIGGER trigger_update_cities_count
  AFTER INSERT ON public.city_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cities_count();

-- 7. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.city_visits TO authenticated;
GRANT EXECUTE ON FUNCTION public.should_add_city_visit TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_cities_count TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
