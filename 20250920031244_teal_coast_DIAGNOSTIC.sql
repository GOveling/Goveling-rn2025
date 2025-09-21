/*
  DIAGNOSTIC QUERY - Check trips table structure
  This will show us exactly what columns exist in the trips table
*/

-- Show all columns in the trips table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trips' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check if trips table exists at all
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'trips' 
AND table_schema = 'public';

-- Check trip_collaborators table structure too
SELECT 
    'trip_collaborators' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'trip_collaborators' 
AND table_schema = 'public'
ORDER BY ordinal_position;
