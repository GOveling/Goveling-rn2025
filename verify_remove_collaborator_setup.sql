-- Verification script for remove collaborator functionality
-- Run these SELECT queries to verify the setup

-- 1) Check if trip_collaborators policies allow owner to manage collaborators
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'trip_collaborators' AND schemaname = 'public';

-- 2) Verify that accept_invitation and reject_invitation functions exist and are accessible
SELECT routine_name, routine_type, security_type 
FROM information_schema.routines 
WHERE routine_name IN ('accept_invitation', 'reject_invitation') 
AND routine_schema = 'public';

-- 3) Check grants on these functions (simplified version)
SELECT 
    p.proname as function_name,
    p.proacl as access_privileges,
    case when p.proacl is null then 'PUBLIC' else 'RESTRICTED' end as access_type
FROM pg_proc p 
WHERE p.proname IN ('accept_invitation', 'reject_invitation')
AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4) Verify realtime publication includes needed tables
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('trip_collaborators', 'trip_invitations', 'notifications_inbox');

-- 5) Test query: check what trips a specific user can see as collaborator
-- Replace 'USER_ID_HERE' with actual user ID to test
-- SELECT tc.trip_id, tc.role, t.title 
-- FROM trip_collaborators tc
-- JOIN trips t ON t.id = tc.trip_id
-- WHERE tc.user_id = 'USER_ID_HERE';