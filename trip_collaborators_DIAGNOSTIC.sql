/*
  DIAGNOSTIC QUERY - Check trip_collaborators table structure specifically
  Let's see exactly what columns exist in trip_collaborators
*/

-- Show all columns in trip_collaborators table with details
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trip_collaborators' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also show some sample data to understand the structure
SELECT * FROM public.trip_collaborators LIMIT 3;
