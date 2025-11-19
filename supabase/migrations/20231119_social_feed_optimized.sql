-- =====================================================
-- SOCIAL FEED FUNCTIONS - OPTIMIZED VERSION
-- Uses country_visits table for proper geographic filtering
-- =====================================================

-- Drop existing functions if they exist (with CASCADE to remove all versions)
DROP FUNCTION IF EXISTS get_my_posts CASCADE;
DROP FUNCTION IF EXISTS get_nearby_posts CASCADE;
DROP FUNCTION IF EXISTS get_my_trips_posts CASCADE;
DROP FUNCTION IF EXISTS get_following_posts CASCADE;
DROP FUNCTION IF EXISTS get_global_random_posts CASCADE;
DROP FUNCTION IF EXISTS get_dynamic_social_feed CASCADE;

-- =====================================================
-- FUNCTION 1: Get user's own posts (for "MIS POST" section)
-- =====================================================
CREATE OR REPLACE FUNCTION get_my_posts(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 3,
  p_offset INTEGER DEFAULT 0
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
    1.0::NUMERIC AS relevance_score,
    'my_posts'::TEXT AS feed_source
  FROM posts p
  INNER JOIN user_profiles up ON up.id = p.user_id
  LEFT JOIN post_likes pl ON pl.post_id = p.id
  LEFT JOIN comments c ON c.post_id = p.id
  WHERE p.user_id = p_user_id
  GROUP BY p.id, p.user_id, p.caption, p.created_at, up.username, up.display_name, up.avatar_url
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- FUNCTION 2: Get posts from nearby locations
-- Uses trip_places to find posts from places in countries the user has visited
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
    AND gp.google_place_id IS NOT NULL
    -- Post's place is in the same country as places in user's trips
    AND EXISTS (
      SELECT 1 
      FROM trip_places tp_post
      WHERE tp_post.place_id = gp.google_place_id
        AND tp_post.country_code IN (
          -- Get all country_codes from user's trips
          SELECT DISTINCT tp_user.country_code
          FROM trip_places tp_user
          INNER JOIN trips t_user ON t_user.id = tp_user.trip_id
          WHERE t_user.user_id = current_user_id
            AND tp_user.country_code IS NOT NULL
        )
    )
  GROUP BY p.id, p.user_id, p.caption, p.created_at, up.username, up.display_name, up.avatar_url
  ORDER BY RANDOM()
  LIMIT limit_count;
END;
$$;

-- =====================================================
-- FUNCTION 3: Get posts from user's trip countries
-- Uses trip_places to find posts from exact places in user's trips
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
    -- Post's place exists in user's trip_places (same exact place)
    AND EXISTS (
      SELECT 1 
      FROM trip_places tp
      INNER JOIN trips t ON t.id = tp.trip_id
      WHERE t.user_id = current_user_id
        AND tp.place_id = gp.google_place_id
    )
  GROUP BY p.id, p.user_id, p.caption, p.created_at, up.username, up.display_name, up.avatar_url
  ORDER BY RANDOM()
  LIMIT limit_count;
END;
$$;

-- =====================================================
-- FUNCTION 4: Get posts from users you follow
-- =====================================================
CREATE OR REPLACE FUNCTION get_following_posts(
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
    0.9::NUMERIC AS relevance_score,
    'following'::TEXT AS feed_source
  FROM posts p
  INNER JOIN user_profiles up ON up.id = p.user_id
  LEFT JOIN post_likes pl ON pl.post_id = p.id
  LEFT JOIN comments c ON c.post_id = p.id
  WHERE p.user_id IN (
    SELECT following_id 
    FROM user_follows 
    WHERE follower_id = current_user_id
  )
  GROUP BY p.id, p.user_id, p.caption, p.created_at, up.username, up.display_name, up.avatar_url
  ORDER BY p.created_at DESC
  LIMIT limit_count;
END;
$$;

-- =====================================================
-- FUNCTION 5: Get random global posts
-- =====================================================
CREATE OR REPLACE FUNCTION get_global_random_posts(
  current_user_id UUID,
  limit_count INTEGER DEFAULT 3
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
    0.5::NUMERIC AS relevance_score,
    'global'::TEXT AS feed_source
  FROM posts p
  INNER JOIN user_profiles up ON up.id = p.user_id
  LEFT JOIN post_likes pl ON pl.post_id = p.id
  LEFT JOIN comments c ON c.post_id = p.id
  WHERE p.user_id != current_user_id
  GROUP BY p.id, p.user_id, p.caption, p.created_at, up.username, up.display_name, up.avatar_url
  ORDER BY RANDOM()
  LIMIT limit_count;
END;
$$;

-- =====================================================
-- FUNCTION 6: Get dynamic social feed (main function)
-- Mixes posts from different sources with random distribution
-- =====================================================
CREATE OR REPLACE FUNCTION get_dynamic_social_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 8,
  p_offset INTEGER DEFAULT 0
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
DECLARE
  nearby_limit INTEGER;
  trips_limit INTEGER;
  following_limit INTEGER;
  global_limit INTEGER;
BEGIN
  -- Random distribution for dynamic feed
  -- nearby: 2-4 posts, my_trips: 1-3 posts, following: 1-3 posts, global: 0-2 posts
  nearby_limit := 2 + floor(random() * 3)::INTEGER; -- 2-4
  trips_limit := 1 + floor(random() * 3)::INTEGER;  -- 1-3
  following_limit := 1 + floor(random() * 3)::INTEGER; -- 1-3
  global_limit := floor(random() * 3)::INTEGER; -- 0-2

  RETURN QUERY
  WITH mixed_posts AS (
    -- Nearby posts (40-50%)
    SELECT * FROM get_nearby_posts(p_user_id, nearby_limit)
    UNION ALL
    -- My trips posts (20-30%)
    SELECT * FROM get_my_trips_posts(p_user_id, trips_limit)
    UNION ALL
    -- Following posts (20-30%)
    SELECT * FROM get_following_posts(p_user_id, following_limit)
    UNION ALL
    -- Global random posts (10%)
    SELECT * FROM get_global_random_posts(p_user_id, global_limit)
  )
  SELECT DISTINCT ON (mp.post_id)
    mp.post_id,
    mp.user_id,
    mp.caption,
    mp.created_at,
    mp.likes_count,
    mp.comments_count,
    mp.username,
    mp.display_name,
    mp.avatar_url,
    mp.relevance_score,
    mp.feed_source
  FROM mixed_posts mp
  ORDER BY mp.post_id, RANDOM()
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_my_posts TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_posts TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_trips_posts TO authenticated;
GRANT EXECUTE ON FUNCTION get_following_posts TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_random_posts TO authenticated;
GRANT EXECUTE ON FUNCTION get_dynamic_social_feed TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION get_my_posts IS 'Returns user''s own posts for MIS POST section';
COMMENT ON FUNCTION get_nearby_posts IS 'Returns posts from countries the user has visited (uses country_visits table)';
COMMENT ON FUNCTION get_my_trips_posts IS 'Returns posts from countries in user''s trips (uses country_visits table)';
COMMENT ON FUNCTION get_following_posts IS 'Returns posts from users being followed';
COMMENT ON FUNCTION get_global_random_posts IS 'Returns random posts from any user';
COMMENT ON FUNCTION get_dynamic_social_feed IS 'Main function that mixes all sources with dynamic random distribution';
