-- =====================================================
-- UPGRADE: Enhanced social feed functions with country_code
-- Run this AFTER adding country_code column and populating it
-- =====================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS get_nearby_posts CASCADE;
DROP FUNCTION IF EXISTS get_my_trips_posts CASCADE;

-- =====================================================
-- FUNCTION 2: Get posts from nearby locations (ENHANCED)
-- Uses country_code from global_places for real geographic filtering
-- =====================================================
CREATE OR REPLACE FUNCTION get_nearby_posts(
  current_user_id UUID,
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  caption TEXT,
  created_at TIMESTAMPTZ,
  likes_count INTEGER,
  comments_count INTEGER,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  relevance_score NUMERIC,
  feed_source TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS post_id,
    p.user_id,
    p.caption,
    p.created_at,
    COALESCE(COUNT(DISTINCT pl.id), 0)::INTEGER AS likes_count,
    COALESCE(COUNT(DISTINCT c.id), 0)::INTEGER AS comments_count,
    up.username,
    up.display_name,
    up.avatar_url,
    0.7::NUMERIC AS relevance_score,
    'nearby'::TEXT AS feed_source
  FROM posts p
  INNER JOIN user_profiles up ON up.id = p.user_id
  INNER JOIN global_places gp ON gp.id = p.place_id
  LEFT JOIN post_likes pl ON pl.post_id = p.id
  LEFT JOIN comments c ON c.post_id = p.id
  WHERE p.user_id != current_user_id
    AND gp.country_code IS NOT NULL
    -- Post is from a country the user has visited
    AND EXISTS (
      SELECT 1 
      FROM country_visits cv_user
      INNER JOIN trips t_user ON t_user.id = cv_user.trip_id
      WHERE t_user.user_id = current_user_id
        AND cv_user.country_code = gp.country_code
    )
  GROUP BY p.id, p.user_id, p.caption, p.created_at, up.username, up.display_name, up.avatar_url
  ORDER BY RANDOM()
  LIMIT limit_count;
END;
$$;

-- =====================================================
-- FUNCTION 3: Get posts from user's trip countries (ENHANCED)
-- Uses country_code from global_places for real geographic filtering
-- =====================================================
CREATE OR REPLACE FUNCTION get_my_trips_posts(
  current_user_id UUID,
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  caption TEXT,
  created_at TIMESTAMPTZ,
  likes_count INTEGER,
  comments_count INTEGER,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  relevance_score NUMERIC,
  feed_source TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS post_id,
    p.user_id,
    p.caption,
    p.created_at,
    COALESCE(COUNT(DISTINCT pl.id), 0)::INTEGER AS likes_count,
    COALESCE(COUNT(DISTINCT c.id), 0)::INTEGER AS comments_count,
    up.username,
    up.display_name,
    up.avatar_url,
    0.8::NUMERIC AS relevance_score,
    'my_trips'::TEXT AS feed_source
  FROM posts p
  INNER JOIN user_profiles up ON up.id = p.user_id
  INNER JOIN global_places gp ON gp.id = p.place_id
  LEFT JOIN post_likes pl ON pl.post_id = p.id
  LEFT JOIN comments c ON c.post_id = p.id
  WHERE p.user_id != current_user_id
    AND gp.country_code IS NOT NULL
    -- Post is from a country in user's trip destinations
    AND EXISTS (
      SELECT 1 
      FROM country_visits cv_user
      INNER JOIN trips t_user ON t_user.id = cv_user.trip_id
      WHERE t_user.user_id = current_user_id
        AND cv_user.country_code = gp.country_code
    )
  GROUP BY p.id, p.user_id, p.caption, p.created_at, up.username, up.display_name, up.avatar_url
  ORDER BY RANDOM()
  LIMIT limit_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_nearby_posts TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_trips_posts TO authenticated;

-- Comments
COMMENT ON FUNCTION get_nearby_posts IS 'Returns posts from countries the user has visited (requires country_code in global_places)';
COMMENT ON FUNCTION get_my_trips_posts IS 'Returns posts from countries in user''s trips (requires country_code in global_places)';
