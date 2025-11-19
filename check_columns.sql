-- Query to check actual column types
SELECT 
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name IN ('posts', 'trip_places')
  AND column_name LIKE '%place_id%'
ORDER BY table_name, column_name;
