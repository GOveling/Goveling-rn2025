-- Create function to get user posts for profile screen
-- This function returns all published posts from a specific user with images and stats

CREATE OR REPLACE FUNCTION get_user_posts(
  p_user_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  place_id UUID,
  caption TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  place_name TEXT,
  google_place_id TEXT,
  country_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  image_id UUID,
  thumbnail_url TEXT,
  main_url TEXT,
  blurhash TEXT,
  width INT,
  height INT,
  order_index INT,
  image_is_moderated BOOLEAN,
  moderation_labels JSONB,
  image_created_at TIMESTAMPTZ,
  likes_count BIGINT,
  comments_count BIGINT,
  saves_count BIGINT,
  user_has_liked BOOLEAN,
  user_has_saved BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  RETURN QUERY
  WITH post_stats AS (
    SELECT 
      p.id as pid,
      COUNT(DISTINCT pl.id)::BIGINT AS likes,
      COUNT(DISTINCT c.id)::BIGINT AS comments,
      COUNT(DISTINCT ps.id)::BIGINT AS saves
    FROM posts p
    LEFT JOIN post_likes pl ON pl.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id AND c.is_deleted = FALSE
    LEFT JOIN post_saves ps ON ps.post_id = p.id
    WHERE p.user_id = p_user_id
      AND p.status = 'published'
    GROUP BY p.id
  ),
  user_interactions AS (
    SELECT 
      p.id as pid,
      EXISTS(SELECT 1 FROM post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = current_user_id)::BOOLEAN AS has_liked,
      EXISTS(SELECT 1 FROM post_saves ps2 WHERE ps2.post_id = p.id AND ps2.user_id = current_user_id)::BOOLEAN AS has_saved
    FROM posts p
    WHERE p.user_id = p_user_id
      AND p.status = 'published'
  )
  SELECT 
    p.id::UUID,
    p.user_id::UUID,
    p.place_id::UUID,
    p.caption::TEXT,
    p.created_at::TIMESTAMPTZ,
    p.updated_at::TIMESTAMPTZ,
    up.username::TEXT,
    up.display_name::TEXT,
    up.avatar_url::TEXT,
    gp.name::TEXT,
    gp.google_place_id::TEXT,
    gp.country_code::TEXT,
    gp.latitude::NUMERIC,
    gp.longitude::NUMERIC,
    pi.id::UUID,
    pi.thumbnail_url::TEXT,
    pi.main_url::TEXT,
    pi.blurhash::TEXT,
    pi.width::INT,
    pi.height::INT,
    pi.order_index::INT,
    pi.is_moderated::BOOLEAN,
    pi.moderation_labels::JSONB,
    pi.created_at::TIMESTAMPTZ,
    COALESCE(pstats.likes, 0)::BIGINT,
    COALESCE(pstats.comments, 0)::BIGINT,
    COALESCE(pstats.saves, 0)::BIGINT,
    COALESCE(ui.has_liked, FALSE)::BOOLEAN,
    COALESCE(ui.has_saved, FALSE)::BOOLEAN
  FROM posts p
  INNER JOIN user_profiles up ON up.id = p.user_id
  LEFT JOIN global_places gp ON gp.id = p.place_id
  LEFT JOIN post_images pi ON pi.post_id = p.id
  LEFT JOIN post_stats pstats ON pstats.pid = p.id
  LEFT JOIN user_interactions ui ON ui.pid = p.id
  WHERE p.user_id = p_user_id
    AND p.status = 'published'
  ORDER BY p.created_at DESC, pi.order_index ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_posts(UUID, INT, INT) TO authenticated;
