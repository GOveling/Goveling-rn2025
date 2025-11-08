-- ========================================
-- Migration: Fix get_popular_places_v2 to work with direct queries
-- Date: 2025-11-08
-- Purpose: Make the function work without depending on materialized view
-- ========================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_popular_places_v2(TEXT, TEXT, INT, TEXT[]);

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
  description TEXT,
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
BEGIN
  -- ========================================
  -- STEP 1: Detect current traffic level from actual data
  -- ========================================
  SELECT 
    CASE 
      WHEN COUNT(DISTINCT CASE WHEN added_at >= NOW() - INTERVAL '1 hour' THEN id END) >= 50 THEN 1  -- ULTRA HOT
      WHEN COUNT(DISTINCT CASE WHEN added_at >= NOW() - INTERVAL '6 hours' THEN id END) >= 30 THEN 2   -- TRENDING
      WHEN COUNT(DISTINCT CASE WHEN added_at >= NOW() - INTERVAL '24 hours' THEN id END) >= 10 THEN 3  -- POPULAR
      ELSE 4                                                                                             -- RISING
    END
  INTO detected_traffic_level
  FROM trip_places;

  -- Default to RISING if null
  detected_traffic_level := COALESCE(detected_traffic_level, 4);

  -- ========================================
  -- STEP 2: Return popular places with real-time data
  -- ========================================
  RETURN QUERY
  WITH place_stats AS (
    SELECT 
      tp.place_id,
      tp.name,
      tp.category,
      tp.address,
      tp.city,
      tp.country_code,
      COALESCE(tp.continent, 
        CASE 
          WHEN tp.country_code IN ('US', 'CA', 'MX', 'BR', 'AR', 'CL', 'PE', 'CO', 'VE', 'UY', 'PY', 'BO', 'EC') THEN 'América'
          WHEN tp.country_code IN ('GB', 'FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'CH', 'AT', 'GR', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'IE', 'RU') THEN 'Europa'
          WHEN tp.country_code IN ('CN', 'JP', 'KR', 'TH', 'VN', 'ID', 'IN', 'PH', 'MY', 'SG', 'HK', 'TW', 'BD', 'PK') THEN 'Asia'
          WHEN tp.country_code IN ('AU', 'NZ', 'FJ', 'PG') THEN 'Oceanía'
          WHEN tp.country_code IN ('ZA', 'EG', 'MA', 'KE', 'NG', 'TN', 'DZ', 'ET', 'GH') THEN 'África'
          ELSE 'Otro'
        END
      ) AS continent,
      tp.lat,
      tp.lng,
      tp.editorial_summary AS description,
      tp.photo_url,
      -- Time-based saves counts
      COUNT(DISTINCT CASE WHEN tp.added_at >= NOW() - INTERVAL '1 hour' THEN tp.id END) AS saves_1h,
      COUNT(DISTINCT CASE WHEN tp.added_at >= NOW() - INTERVAL '6 hours' THEN tp.id END) AS saves_6h,
      COUNT(DISTINCT CASE WHEN tp.added_at >= NOW() - INTERVAL '24 hours' THEN tp.id END) AS saves_24h,
      -- Unique users and countries
      COUNT(DISTINCT tp.added_by) AS unique_users,
      COUNT(DISTINCT tp.country_code) AS countries_count,
      -- Total saves for scoring
      COUNT(*) AS total_saves
    FROM trip_places tp
    WHERE 
      tp.place_id IS NOT NULL
      AND tp.place_id NOT IN (SELECT unnest(exclude_place_ids))
      AND tp.added_at >= NOW() - INTERVAL '30 days'  -- Only consider recent data
    GROUP BY 
      tp.place_id, tp.name, tp.category, tp.address, tp.city, 
      tp.country_code, tp.continent, tp.lat, tp.lng, 
      tp.editorial_summary, tp.photo_url
    HAVING COUNT(*) >= 2  -- At least 2 saves to be considered
  ),
  scored_places AS (
    SELECT 
      ps.*,
      -- Calculate trending score
      (
        (ps.saves_1h * 10.0) +
        (ps.saves_6h * 3.0) +
        (ps.saves_24h * 1.5) +
        (ps.unique_users * 2.0) +
        (ps.countries_count * 1.5)
      ) AS trending_score,
      -- Assign badge
      CASE 
        WHEN ps.saves_1h >= 5 THEN '🔥 HOT NOW'
        WHEN ps.saves_6h >= 8 THEN '📈 TRENDING'
        WHEN ps.saves_24h >= 10 THEN '⭐ POPULAR'
        ELSE '🌟 RISING'
      END AS badge,
      -- Assign emoji based on category
      CASE 
        WHEN ps.category = 'tourist_attraction' THEN '🎡'
        WHEN ps.category = 'museum' THEN '🏛️'
        WHEN ps.category = 'restaurant' THEN '🍽️'
        WHEN ps.category = 'cafe' THEN '☕'
        WHEN ps.category = 'bar' THEN '🍺'
        WHEN ps.category = 'park' THEN '🌳'
        WHEN ps.category = 'shopping_mall' THEN '🛍️'
        WHEN ps.category = 'lodging' OR ps.category = 'hotel' THEN '🏨'
        WHEN ps.category = 'airport' THEN '✈️'
        WHEN ps.category = 'church' OR ps.category = 'place_of_worship' THEN '⛪'
        WHEN ps.category = 'beach' THEN '🏖️'
        WHEN ps.category = 'mountain' THEN '⛰️'
        WHEN ps.category = 'stadium' THEN '🏟️'
        WHEN ps.category = 'zoo' THEN '🦁'
        WHEN ps.category = 'aquarium' THEN '🐠'
        ELSE '📍'
      END AS emoji,
      -- Format location display
      CONCAT(
        COALESCE(ps.city, ''),
        CASE WHEN ps.city IS NOT NULL AND ps.country_code IS NOT NULL THEN ', ' ELSE '' END,
        COALESCE(ps.country_code, '')
      ) AS location_display
    FROM place_stats ps
  ),
  prioritized_places AS (
    SELECT 
      sp.*,
      -- Prioritize local places if user location is known
      CASE 
        WHEN user_country_code IS NOT NULL AND sp.country_code = user_country_code THEN 100
        WHEN user_continent IS NOT NULL AND sp.continent = user_continent THEN 50
        ELSE 0
      END AS locality_bonus
    FROM scored_places sp
  )
  SELECT 
    pp.place_id::TEXT AS id,
    pp.name::TEXT,
    pp.category::TEXT,
    pp.address::TEXT,
    pp.city::TEXT,
    pp.country_code::TEXT,
    pp.continent::TEXT,
    pp.lat::DECIMAL,
    pp.lng::DECIMAL,
    pp.description::TEXT,
    pp.photo_url::TEXT,
    pp.saves_1h::INT,
    pp.saves_6h::INT,
    pp.saves_24h::INT,
    pp.unique_users::INT,
    pp.countries_count::INT,
    pp.trending_score::DECIMAL,
    pp.badge::TEXT,
    detected_traffic_level::INT AS traffic_level,
    pp.emoji::TEXT,
    pp.location_display::TEXT
  FROM prioritized_places pp
  ORDER BY 
    pp.locality_bonus DESC,
    pp.trending_score DESC,
    pp.total_saves DESC
  LIMIT max_results;
  
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_popular_places_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_places_v2 TO anon;

-- Add comment
COMMENT ON FUNCTION get_popular_places_v2 IS 
'Returns popular places based on real-time trip_places data.
Includes smart prioritization, trending scores, and traffic detection.
Works without materialized views for better reliability.';
