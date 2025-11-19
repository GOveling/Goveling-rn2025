-- Debug: Verificar qué devuelve get_user_feed
-- Reemplaza 'TU_USER_ID' con tu ID de usuario (8d8d65a0-c92f-42bf-9450-22964a3640e3)

SELECT * FROM get_user_feed(
  '8d8d65a0-c92f-42bf-9450-22964a3640e3'::UUID,
  10,
  0
);

-- Ver si existe user_profiles para tu usuario
SELECT id, username, display_name, avatar_url
FROM user_profiles
WHERE id = '8d8d65a0-c92f-42bf-9450-22964a3640e3';

-- Ver el status de los posts
SELECT 
  id,
  user_id,
  place_id,
  status,
  created_at
FROM posts
WHERE user_id = '8d8d65a0-c92f-42bf-9450-22964a3640e3'
ORDER BY created_at DESC
LIMIT 5;
