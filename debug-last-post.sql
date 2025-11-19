-- Debug: Ver el último post creado
SELECT 
  p.id,
  p.user_id,
  p.place_id,
  p.caption,
  p.status,
  p.created_at,
  up.username,
  (SELECT COUNT(*) FROM post_images WHERE post_id = p.id) as images_count
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.id
ORDER BY p.created_at DESC
LIMIT 5;

-- Ver los global_places
SELECT id, name, google_place_id, latitude, longitude
FROM global_places
ORDER BY created_at DESC
LIMIT 5;
