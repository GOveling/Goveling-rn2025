SELECT 
  pi.id,
  SUBSTRING(pi.id::text, 1, 8) as short_id,
  pi.post_id,
  pi.order_index,
  SUBSTRING(pi.main_url, LENGTH(pi.main_url) - 20) as url_suffix
FROM post_images pi
WHERE pi.post_id IN (
  SELECT p.id 
  FROM posts p 
  WHERE p.user_id = '8d8d65a0-c92f-42bf-9450-22964a3640e3'
)
ORDER BY pi.post_id, pi.order_index;
