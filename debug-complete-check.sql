-- ============================================================================
-- DEBUG COMPLETO: Verificar por qué no aparecen posts en el feed
-- ============================================================================

-- 1. Ver todos los posts creados
SELECT 
  p.id,
  p.user_id,
  p.place_id,
  p.caption,
  p.status,
  p.created_at,
  (SELECT COUNT(*) FROM post_images WHERE post_id = p.id) as images_count
FROM posts p
ORDER BY p.created_at DESC
LIMIT 5;

-- 2. Ver si existe user_profiles para el usuario
SELECT 
  id, 
  username, 
  display_name, 
  avatar_url,
  created_at
FROM user_profiles
WHERE id = '8d8d65a0-c92f-42bf-9450-22964a3640e3';

-- 3. Ver global_places
SELECT id, name, google_place_id, latitude, longitude
FROM global_places
ORDER BY created_at DESC
LIMIT 5;

-- 4. Ver post_images
SELECT 
  pi.id,
  pi.post_id,
  pi.thumbnail_url,
  pi.order_index
FROM post_images pi
ORDER BY pi.created_at DESC
LIMIT 5;

-- 5. Probar la función get_user_feed directamente
SELECT * FROM get_user_feed(
  '8d8d65a0-c92f-42bf-9450-22964a3640e3'::UUID,
  10,
  0
);

-- 6. Ver qué posts cumplen con los criterios de la función
SELECT 
  p.id,
  p.user_id,
  p.status,
  up.username,
  gp.name as place_name,
  CASE 
    WHEN p.status = 'published' THEN 'OK'
    ELSE 'STATUS NO ES published'
  END as status_check,
  CASE 
    WHEN up.id IS NOT NULL THEN 'OK'
    ELSE 'NO TIENE user_profiles'
  END as profile_check,
  CASE 
    WHEN gp.id IS NOT NULL THEN 'OK'
    ELSE 'NO TIENE global_place'
  END as place_check
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.id
LEFT JOIN global_places gp ON p.place_id = gp.id
WHERE p.user_id = '8d8d65a0-c92f-42bf-9450-22964a3640e3'
ORDER BY p.created_at DESC
LIMIT 5;
