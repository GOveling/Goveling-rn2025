/*
  FULL DIAGNOSTIC - Let's see what's happening in the database
  This will help us understand what's causing the user_id error
*/

-- Check if trip_place_visits table already exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'trip_place_visits' 
AND table_schema = 'public';

-- Check if there are any existing policies on trip_place_visits
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'trip_place_visits';

-- Check for any triggers on trip_place_visits
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trip_place_visits';

-- Check what tables actually exist in public schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check if there are any functions that might be causing issues
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%trip%';

-- Try to see what error PostgreSQL gives us about user_id
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'trip_place_visits' 
AND table_schema = 'public';
