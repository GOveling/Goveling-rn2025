-- =====================================================
-- FASE 1: Funciones SQL para MIS POST y GOVELING SOCIAL
-- =====================================================

-- =====================================================
-- 1. Función para obtener posts del usuario (MIS POST)
-- =====================================================
CREATE OR REPLACE FUNCTION get_my_posts(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  place_id UUID,
  place_name TEXT,
  place_country_code TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ,
  likes_count BIGINT,
  comments_count BIGINT,
  user_has_liked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as post_id,
    p.user_id,
    up.username,
    up.display_name,
    up.avatar_url,
    p.place_id,
    gp.name as place_name,
    gp.country_code as place_country_code,
    p.caption,
    p.created_at,
    COUNT(DISTINCT pl.id) as likes_count,
    COUNT(DISTINCT c.id) as comments_count,
    TRUE as user_has_liked -- Siempre true porque es tu propio like implícito
  FROM posts p
  INNER JOIN user_profiles up ON p.user_id = up.id
  LEFT JOIN global_places gp ON p.place_id = gp.id
  LEFT JOIN post_likes pl ON p.id = pl.post_id
  LEFT JOIN comments c ON p.id = c.post_id
  WHERE p.user_id = p_user_id
  AND p.status = 'published'
  GROUP BY p.id, p.user_id, up.username, up.display_name, up.avatar_url, p.place_id, gp.name, gp.country_code, p.caption, p.created_at
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Función auxiliar: Posts por cercanía geográfica
-- =====================================================
CREATE OR REPLACE FUNCTION get_nearby_posts(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  post_id UUID,
  relevance_score NUMERIC
) AS $$
DECLARE
  user_lat NUMERIC;
  user_lon NUMERIC;
BEGIN
  -- Obtener última ubicación del usuario desde user_profiles o trips activos
  SELECT latitude, longitude INTO user_lat, user_lon
  FROM user_profiles
  WHERE id = p_user_id
  LIMIT 1;

  -- Si no tiene ubicación guardada, usar ubicación de su trip activo más reciente
  IF user_lat IS NULL OR user_lon IS NULL THEN
    SELECT t.start_latitude, t.start_longitude INTO user_lat, user_lon
    FROM trips t
    WHERE t.user_id = p_user_id
    AND t.status IN ('active', 'upcoming')
    ORDER BY t.start_date DESC
    LIMIT 1;
  END IF;

  -- Si aún no hay ubicación, retornar vacío
  IF user_lat IS NULL OR user_lon IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.id as post_id,
    -- Score basado en distancia (más cerca = mayor score)
    CASE 
      WHEN gp.latitude IS NULL OR gp.longitude IS NULL THEN 0
      ELSE (
        1.0 / (1.0 + (
          -- Cálculo aproximado de distancia en km usando fórmula haversine simplificada
          6371 * acos(
            cos(radians(user_lat)) * cos(radians(gp.latitude)) * 
            cos(radians(gp.longitude) - radians(user_lon)) + 
            sin(radians(user_lat)) * sin(radians(gp.latitude))
          )
        ) / 1000.0)
      )
    END as relevance_score
  FROM posts p
  JOIN global_places gp ON p.place_id = gp.id
  WHERE p.user_id != p_user_id
  AND p.status = 'published'
  AND gp.latitude IS NOT NULL
  AND gp.longitude IS NOT NULL
  ORDER BY relevance_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. Función auxiliar: Posts de lugares en mis trips
-- =====================================================
CREATE OR REPLACE FUNCTION get_my_trips_posts(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  post_id UUID,
  relevance_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH user_trip_countries AS (
    SELECT DISTINCT unnest(countries) as country_code
    FROM trips
    WHERE user_id = p_user_id
    AND status IN ('active', 'upcoming', 'completed')
  )
  SELECT 
    p.id as post_id,
    0.8 as relevance_score -- Score fijo alto para posts de países en mis trips
  FROM posts p
  JOIN global_places gp ON p.place_id = gp.id
  WHERE p.user_id != p_user_id
  AND p.status = 'published'
  AND gp.country_code IN (SELECT country_code FROM user_trip_countries)
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Función auxiliar: Posts de usuarios seguidos
-- =====================================================
CREATE OR REPLACE FUNCTION get_following_posts(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  post_id UUID,
  relevance_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as post_id,
    0.9 as relevance_score -- Score muy alto para posts de seguidos
  FROM posts p
  WHERE p.user_id IN (
    SELECT following_id 
    FROM user_follows 
    WHERE follower_id = p_user_id
  )
  AND p.status = 'published'
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. Función auxiliar: Posts globales aleatorios (fallback)
-- =====================================================
CREATE OR REPLACE FUNCTION get_global_random_posts(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  post_id UUID,
  relevance_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as post_id,
    0.3 as relevance_score -- Score bajo pero asegura contenido
  FROM posts p
  WHERE p.user_id != p_user_id
  AND p.status = 'published'
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. Función principal: Dynamic Social Feed (GOVELING SOCIAL)
-- =====================================================
CREATE OR REPLACE FUNCTION get_dynamic_social_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  place_id UUID,
  place_name TEXT,
  place_country_code TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ,
  likes_count BIGINT,
  comments_count BIGINT,
  user_has_liked BOOLEAN,
  feed_source TEXT -- Para debug: 'nearby', 'my_trips', 'following', 'global'
) AS $$
DECLARE
  posts_nearby INTEGER;
  posts_trips INTEGER;
  posts_following INTEGER;
  posts_global INTEGER;
  random_distribution NUMERIC;
BEGIN
  -- Generar distribución aleatoria (suma = 100%)
  random_distribution := random(); -- 0.0 a 1.0
  
  -- Distribuir posts basado en número aleatorio
  IF random_distribution < 0.5 THEN
    -- Distribución 1: Favorece cercanía
    posts_nearby := CEIL(p_limit * 0.5);
    posts_trips := CEIL(p_limit * 0.2);
    posts_following := CEIL(p_limit * 0.2);
    posts_global := CEIL(p_limit * 0.1);
  ELSIF random_distribution < 0.8 THEN
    -- Distribución 2: Favorece trips
    posts_nearby := CEIL(p_limit * 0.3);
    posts_trips := CEIL(p_limit * 0.4);
    posts_following := CEIL(p_limit * 0.2);
    posts_global := CEIL(p_limit * 0.1);
  ELSE
    -- Distribución 3: Favorece seguidos
    posts_nearby := CEIL(p_limit * 0.2);
    posts_trips := CEIL(p_limit * 0.2);
    posts_following := CEIL(p_limit * 0.5);
    posts_global := CEIL(p_limit * 0.1);
  END IF;

  RETURN QUERY
  WITH mixed_posts AS (
    -- Posts cercanos
    SELECT post_id, 'nearby' as source, relevance_score
    FROM get_nearby_posts(p_user_id, posts_nearby)
    
    UNION ALL
    
    -- Posts de mis trips
    SELECT post_id, 'my_trips' as source, relevance_score
    FROM get_my_trips_posts(p_user_id, posts_trips)
    
    UNION ALL
    
    -- Posts de seguidos
    SELECT post_id, 'following' as source, relevance_score
    FROM get_following_posts(p_user_id, posts_following)
    
    UNION ALL
    
    -- Posts globales (fallback)
    SELECT post_id, 'global' as source, relevance_score
    FROM get_global_random_posts(p_user_id, posts_global)
  ),
  deduplicated_posts AS (
    -- Eliminar duplicados, mantener el de mayor score
    SELECT DISTINCT ON (post_id) 
      post_id, 
      source, 
      relevance_score
    FROM mixed_posts
    ORDER BY post_id, relevance_score DESC
  )
  SELECT 
    p.id as post_id,
    p.user_id,
    up.username,
    up.display_name,
    up.avatar_url,
    p.place_id,
    gp.name as place_name,
    gp.country_code as place_country_code,
    p.caption,
    p.created_at,
    COUNT(DISTINCT pl.id) as likes_count,
    COUNT(DISTINCT c.id) as comments_count,
    EXISTS(
      SELECT 1 FROM post_likes 
      WHERE post_id = p.id AND user_id = p_user_id
    ) as user_has_liked,
    dp.source as feed_source
  FROM deduplicated_posts dp
  JOIN posts p ON dp.post_id = p.id
  INNER JOIN user_profiles up ON p.user_id = up.id
  LEFT JOIN global_places gp ON p.place_id = gp.id
  LEFT JOIN post_likes pl ON p.id = pl.post_id
  LEFT JOIN comments c ON p.id = c.post_id
  GROUP BY p.id, p.user_id, up.username, up.display_name, up.avatar_url, p.place_id, gp.name, gp.country_code, p.caption, p.created_at, dp.source, dp.relevance_score
  ORDER BY dp.relevance_score DESC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION get_my_posts(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_posts(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_trips_posts(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_following_posts(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_random_posts(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dynamic_social_feed(UUID, INTEGER, INTEGER) TO authenticated;

-- =====================================================
-- Comentarios para documentación
-- =====================================================
COMMENT ON FUNCTION get_my_posts IS 'Obtiene los posts del usuario para la sección MIS POST';
COMMENT ON FUNCTION get_dynamic_social_feed IS 'Feed dinámico que mezcla aleatoriamente posts por cercanía, trips, seguidos y globales para la sección GOVELING SOCIAL';
