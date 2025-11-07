-- ========================================
-- Migration: Fix get_popular_places_v2 function
-- Date: 2025-11-06
-- Purpose: Update function to work with new materialized view structure
-- ========================================

-- Drop existing function (with all possible signatures)
DROP FUNCTION IF EXISTS get_popular_places_v2(TEXT, TEXT, INT, TEXT[]);
DROP FUNCTION IF EXISTS get_popular_places_v2;

CREATE OR REPLACE FUNCTION get_popular_places_v2(
  user_country_code TEXT DEFAULT NULL,
  user_continent TEXT DEFAULT NULL,
  max_results INT DEFAULT 8,
  exclude_place_ids TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  category TEXT,
  address TEXT,
  city TEXT,
  country_code TEXT,
  continent TEXT,
  lat DECIMAL,
  lng DECIMAL,
  photo_url TEXT,
  saves_1h INT,
  saves_6h INT,
  saves_24h INT,
  unique_users INT,
  countries_count INT,
  trending_score DECIMAL,
  badge TEXT,
  traffic_level INT,
  emoji TEXT,
  location_display TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  detected_traffic_level INT;
  p_user_country_code TEXT := user_country_code;
  p_user_continent TEXT := user_continent;
BEGIN
  -- ========================================
  -- STEP 1: Detect current traffic level
  -- ========================================
  SELECT 
    CASE 
      WHEN SUM(mv.saves_1h) >= 100 THEN 1  -- ULTRA HOT
      WHEN SUM(mv.saves_6h) >= 50 THEN 2   -- TRENDING
      WHEN SUM(mv.saves_24h) >= 20 THEN 3  -- POPULAR
      ELSE 4                             -- RISING
    END
  INTO detected_traffic_level
  FROM mv_popular_places_hot mv;

  -- If materialized view is empty, try direct query
  IF detected_traffic_level IS NULL THEN
    SELECT 
      CASE 
        WHEN COUNT(*) >= 100 THEN 1
        WHEN COUNT(*) >= 50 THEN 2
        WHEN COUNT(*) >= 20 THEN 3
        ELSE 4
      END
    INTO detected_traffic_level
    FROM trip_places
    WHERE created_at >= NOW() - INTERVAL '24 hours';
  END IF;

  -- Default to RISING if still null
  detected_traffic_level := COALESCE(detected_traffic_level, 4);

  -- ========================================
  -- STEP 2: Return popular places
  -- ========================================
  RETURN QUERY
  WITH enriched_places AS (
    SELECT 
      mp.id,
      mp.name,
      mp.category,
      mp.address,
      mp.city,
      mp.country_code,
      -- Map country to continent
      CASE 
        WHEN mp.country_code IN ('US', 'CA', 'MX', 'BR', 'AR', 'CL', 'PE', 'CO', 'VE', 'UY', 'PY', 'BO', 'EC') THEN 'América'
        WHEN mp.country_code IN ('GB', 'FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'CH', 'AT', 'GR', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'IE') THEN 'Europa'
        WHEN mp.country_code IN ('CN', 'JP', 'KR', 'TH', 'VN', 'ID', 'IN', 'PH', 'MY', 'SG', 'HK', 'TW', 'BD', 'PK') THEN 'Asia'
        WHEN mp.country_code IN ('AU', 'NZ', 'FJ', 'PG') THEN 'Oceanía'
        WHEN mp.country_code IN ('ZA', 'EG', 'MA', 'KE', 'NG', 'TN', 'DZ', 'ET', 'GH') THEN 'África'
        ELSE 'Otro'
      END AS continent,
      mp.lat,
      mp.lng,
      mp.photo_url,
      mp.saves_1h::INT,
      mp.saves_6h::INT,
      mp.saves_24h::INT,
      mp.unique_users::INT,
      mp.countries_count::INT,
      mp.trending_score,
      mp.badge,
      mp.traffic_level,
      mp.emoji,
      -- Location display
      COALESCE(
        mp.city || ', ' || mp.country_code,
        mp.address,
        'Global'
      ) AS location_display,
      -- Ranking score with geographic boost
      mp.trending_score * 
      CASE 
        WHEN p_user_country_code IS NOT NULL AND mp.country_code = p_user_country_code THEN 2.0
        WHEN p_user_continent IS NOT NULL AND CASE 
          WHEN mp.country_code IN ('US', 'CA', 'MX', 'BR', 'AR', 'CL', 'PE', 'CO', 'VE', 'UY', 'PY', 'BO', 'EC') THEN 'América'
          WHEN mp.country_code IN ('GB', 'FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'CH', 'AT', 'GR', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'IE') THEN 'Europa'
          WHEN mp.country_code IN ('CN', 'JP', 'KR', 'TH', 'VN', 'ID', 'IN', 'PH', 'MY', 'SG', 'HK', 'TW', 'BD', 'PK') THEN 'Asia'
          WHEN mp.country_code IN ('AU', 'NZ', 'FJ', 'PG') THEN 'Oceanía'
          WHEN mp.country_code IN ('ZA', 'EG', 'MA', 'KE', 'NG', 'TN', 'DZ', 'ET', 'GH') THEN 'África'
          ELSE 'Otro'
        END = p_user_continent THEN 1.5
        ELSE 1.0
      END AS ranking_score
    FROM mv_popular_places_hot mp
    WHERE NOT (mp.id = ANY(exclude_place_ids))
  ),
  diverse_places AS (
    -- Ensure geographic diversity
    SELECT 
      ep.*,
      ROW_NUMBER() OVER (PARTITION BY ep.continent ORDER BY ep.ranking_score DESC) AS continent_rank
    FROM enriched_places ep
  )
  SELECT 
    dp.id,
    dp.name,
    dp.category,
    dp.address,
    dp.city,
    dp.country_code,
    dp.continent,
    dp.lat,
    dp.lng,
    dp.photo_url,
    dp.saves_1h::INT,
    dp.saves_6h::INT,
    dp.saves_24h::INT,
    dp.unique_users::INT,
    dp.countries_count::INT,
    dp.trending_score,
    dp.badge,
    dp.traffic_level,
    dp.emoji,
    dp.location_display
  FROM diverse_places dp
  WHERE dp.continent_rank <= 3 -- Max 3 per continent
  ORDER BY dp.ranking_score DESC, dp.trending_score DESC
  LIMIT max_results;

  RETURN;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_popular_places_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_places_v2 TO anon;

COMMENT ON FUNCTION get_popular_places_v2 IS 
'Returns popular places with auto-adaptive traffic detection and geographic diversity.
Updated to work with emoji field in materialized view.';
