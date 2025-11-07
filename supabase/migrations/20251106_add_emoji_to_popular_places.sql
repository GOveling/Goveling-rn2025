-- ========================================
-- Migration: Add emoji field to popular places
-- Date: 2025-11-06
-- Purpose: Fix missing emoji field in popular places feature
-- ========================================

-- Drop existing materialized view
DROP MATERIALIZED VIEW IF NOT EXISTS mv_popular_places_hot CASCADE;

-- Recreate with emoji field
CREATE MATERIALIZED VIEW mv_popular_places_hot AS
WITH hourly_stats AS (
  -- Statistics from last 1 hour
  SELECT
    CONCAT(name, '|', ROUND(lat::numeric, 4), '|', ROUND(lng::numeric, 4)) AS place_key,
    name,
    category,
    address,
    city,
    country_code,
    lat,
    lng,
    photo_url,
    COUNT(*) AS saves_1h,
    COUNT(DISTINCT added_by) AS unique_users_1h,
    COUNT(DISTINCT country_code) AS countries_count,
    MIN(created_at) AS first_seen,
    MAX(created_at) AS last_seen,
    -- Trending score: more recent saves = higher weight
    SUM(
      CASE 
        WHEN created_at >= NOW() - INTERVAL '15 minutes' THEN 4.0
        WHEN created_at >= NOW() - INTERVAL '30 minutes' THEN 2.0
        WHEN created_at >= NOW() - INTERVAL '45 minutes' THEN 1.5
        ELSE 1.0
      END
    ) AS trending_score
  FROM trip_places
  WHERE created_at >= NOW() - INTERVAL '1 hour'
    AND name IS NOT NULL
    AND lat IS NOT NULL
    AND lng IS NOT NULL
  GROUP BY place_key, name, category, address, city, country_code, lat, lng, photo_url
  HAVING COUNT(*) >= 2 -- Minimum 2 saves
),
six_hour_stats AS (
  -- Statistics from last 6 hours
  SELECT
    CONCAT(name, '|', ROUND(lat::numeric, 4), '|', ROUND(lng::numeric, 4)) AS place_key,
    name,
    category,
    address,
    city,
    country_code,
    lat,
    lng,
    photo_url,
    COUNT(*) AS saves_6h,
    COUNT(DISTINCT added_by) AS unique_users_6h,
    COUNT(DISTINCT country_code) AS countries_count,
    MIN(created_at) AS first_seen,
    MAX(created_at) AS last_seen,
    SUM(
      CASE 
        WHEN created_at >= NOW() - INTERVAL '2 hours' THEN 2.0
        ELSE 1.0
      END
    ) AS trending_score
  FROM trip_places
  WHERE created_at >= NOW() - INTERVAL '6 hours'
    AND name IS NOT NULL
    AND lat IS NOT NULL
    AND lng IS NOT NULL
  GROUP BY place_key, name, category, address, city, country_code, lat, lng, photo_url
  HAVING COUNT(*) >= 2
),
daily_stats AS (
  -- Statistics from last 24 hours
  SELECT
    CONCAT(name, '|', ROUND(lat::numeric, 4), '|', ROUND(lng::numeric, 4)) AS place_key,
    name,
    category,
    address,
    city,
    country_code,
    lat,
    lng,
    photo_url,
    COUNT(*) AS saves_24h,
    COUNT(DISTINCT added_by) AS unique_users_24h,
    COUNT(DISTINCT country_code) AS countries_count,
    MIN(created_at) AS first_seen,
    MAX(created_at) AS last_seen,
    1.0 AS trending_score
  FROM trip_places
  WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND name IS NOT NULL
    AND lat IS NOT NULL
    AND lng IS NOT NULL
  GROUP BY place_key, name, category, address, city, country_code, lat, lng, photo_url
)
SELECT 
  COALESCE(h.place_key, s.place_key, d.place_key) AS id,
  COALESCE(h.name, s.name, d.name) AS name,
  COALESCE(h.category, s.category, d.category) AS category,
  COALESCE(h.address, s.address, d.address) AS address,
  COALESCE(h.city, s.city, d.city) AS city,
  COALESCE(h.country_code, s.country_code, d.country_code) AS country_code,
  COALESCE(h.lat, s.lat, d.lat) AS lat,
  COALESCE(h.lng, s.lng, d.lng) AS lng,
  COALESCE(h.photo_url, s.photo_url, d.photo_url) AS photo_url,
  COALESCE(h.saves_1h, 0) AS saves_1h,
  COALESCE(s.saves_6h, 0) AS saves_6h,
  COALESCE(d.saves_24h, 0) AS saves_24h,
  COALESCE(h.unique_users_1h, s.unique_users_6h, d.unique_users_24h, 0) AS unique_users,
  COALESCE(h.countries_count, s.countries_count, d.countries_count, 0) AS countries_count,
  COALESCE(h.trending_score, s.trending_score, d.trending_score, 0) AS trending_score,
  COALESCE(h.first_seen, s.first_seen, d.first_seen) AS first_seen,
  COALESCE(h.last_seen, s.last_seen, d.last_seen) AS last_seen,
  -- Determine badge automatically
  CASE
    WHEN h.saves_1h >= 5 THEN '🔥 HOT NOW'
    WHEN s.saves_6h >= 3 THEN '📈 TRENDING'
    WHEN d.saves_24h >= 2 THEN '⭐ POPULAR'
    ELSE '🌟 RISING'
  END AS badge,
  -- Traffic level detected
  CASE
    WHEN h.saves_1h >= 5 THEN 1
    WHEN s.saves_6h >= 3 THEN 2
    WHEN d.saves_24h >= 2 THEN 3
    ELSE 4
  END AS traffic_level,
  -- Assign emoji based on category
  CASE COALESCE(h.category, s.category, d.category)
    WHEN 'tourist_attraction' THEN '🏛️'
    WHEN 'restaurant' THEN '🍽️'
    WHEN 'lodging' THEN '🏨'
    WHEN 'park' THEN '🌳'
    WHEN 'museum' THEN '🖼️'
    WHEN 'cafe' THEN '☕'
    WHEN 'coffee_shop' THEN '☕'
    WHEN 'shopping_mall' THEN '🛍️'
    WHEN 'church' THEN '⛪'
    WHEN 'beach' THEN '🏖️'
    WHEN 'bar' THEN '🍺'
    WHEN 'night_club' THEN '🎉'
    WHEN 'stadium' THEN '🏟️'
    WHEN 'airport' THEN '✈️'
    WHEN 'bakery' THEN '🥐'
    WHEN 'barber_shop' THEN '💈'
    WHEN 'amusement_park' THEN '🎢'
    ELSE '📍'
  END AS emoji,
  NOW() AS computed_at
FROM hourly_stats h
FULL OUTER JOIN six_hour_stats s USING (place_key)
FULL OUTER JOIN daily_stats d USING (place_key);

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_popular_places_hot_id 
ON mv_popular_places_hot(id);

-- Create index for traffic level queries
CREATE INDEX IF NOT EXISTS idx_mv_popular_places_hot_traffic 
ON mv_popular_places_hot(traffic_level, trending_score DESC);

-- Create index for country queries
CREATE INDEX IF NOT EXISTS idx_mv_popular_places_hot_country 
ON mv_popular_places_hot(country_code, trending_score DESC);

-- Initial refresh
REFRESH MATERIALIZED VIEW mv_popular_places_hot;

-- Grant permissions
GRANT SELECT ON mv_popular_places_hot TO authenticated;
GRANT SELECT ON mv_popular_places_hot TO anon;

COMMENT ON MATERIALIZED VIEW mv_popular_places_hot IS 
'Pre-computed statistics of popular places. 
Includes emoji field for visual representation.
Provides extreme performance (<10ms queries) for popular places feature.
Note: This view should be refreshed periodically. Manual refresh: REFRESH MATERIALIZED VIEW mv_popular_places_hot;';
