-- ================================================================
-- FIX: pgcrypto Extension Issue
-- Error: "function public.gen_random_bytes(integer) does not exist"
-- ================================================================

-- STEP 1: Check if pgcrypto extension exists
SELECT 
    extname as extension_name,
    extversion as version,
    nspname as schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE extname = 'pgcrypto';

-- STEP 2: Enable pgcrypto extension if not exists
-- Try multiple schemas (public, extensions)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- STEP 3: Verify gen_random_bytes is accessible
-- This should return a hex string (64 characters)
SELECT encode(gen_random_bytes(32), 'hex') as test_token;

-- STEP 4: Check which schema has gen_random_bytes
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'gen_random_bytes';

-- STEP 5: If needed, create alias in public schema
-- (Uncomment if gen_random_bytes is only in extensions schema)
-- CREATE OR REPLACE FUNCTION public.gen_random_bytes(integer)
-- RETURNS bytea
-- LANGUAGE sql
-- STABLE
-- AS $$
--   SELECT extensions.gen_random_bytes($1);
-- $$;

-- STEP 6: Test the invite_to_trip_rpc function exists
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    n.nspname as schema
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'invite_to_trip_rpc';

-- STEP 7: Quick test of the RPC (will fail if not authenticated, but should not fail with pgcrypto error)
-- Don't run this in SQL Editor, only for reference:
-- SELECT * FROM invite_to_trip_rpc(
--   'c1820210-41a5-4e3b-9908-660ded3b97cf'::uuid,
--   'test@example.com',
--   'viewer'
-- );
