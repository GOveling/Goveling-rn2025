-- Migration: v145 - create RPC function get_trip_with_team
-- Purpose: Provide a single RPC to retrieve trip + owner profile + collaborators + counts in one round trip.
-- Author: automated assistant
-- Date: 2025-10-14
-- Reversible: Yes (DROP FUNCTION at end section)
-- Notes:
--  * If RLS on trips / profiles / trip_collaborators prevents access, consider SECURITY DEFINER and a dedicated role.
--  * Review least-privilege before enabling SECURITY DEFINER in production.

-- =============================
-- 1. Safety: drop existing stub (idempotency)
-- =============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'get_trip_with_team' AND n.nspname = 'public'
  ) THEN
    DROP FUNCTION public.get_trip_with_team(uuid);
  END IF;
END $$;

-- =============================
-- 2. Function creation
-- =============================
CREATE OR REPLACE FUNCTION public.get_trip_with_team(p_trip_id uuid)
RETURNS TABLE (
  trip_id uuid,
  owner_id uuid,
  title text,
  start_date date,
  end_date date,
  status text,
  owner_profile jsonb,
  collaborators jsonb,
  collaborators_count integer
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  WITH t AS (
    SELECT tr.id,
           COALESCE(tr.owner_id, tr.user_id) AS owner_id,
           tr.title,
           tr.start_date,
           tr.end_date,
           tr.status
    FROM trips tr
    WHERE tr.id = p_trip_id
  ), owner_prof AS (
    SELECT p.id, p.full_name, p.avatar_url, p.email
    FROM profiles p
    JOIN t ON t.owner_id = p.id
  ), collabs AS (
    SELECT tc.user_id,
           tc.role,
           p.full_name,
           p.avatar_url,
           p.email
    FROM trip_collaborators tc
    LEFT JOIN profiles p ON p.id = tc.user_id
    WHERE tc.trip_id = p_trip_id
  )
  SELECT
    t.id AS trip_id,
    t.owner_id,
    t.title,
    t.start_date,
    t.end_date,
    t.status,
    (SELECT to_jsonb(owner_prof.*) FROM owner_prof) AS owner_profile,
    COALESCE(jsonb_agg(to_jsonb(collabs.*)) FILTER (WHERE collabs.user_id IS NOT NULL), '[]'::jsonb) AS collaborators,
    (SELECT COUNT(*) FROM collabs) + 1 AS collaborators_count  -- +1 owner
  FROM t
  LEFT JOIN collabs ON TRUE
  GROUP BY t.id, t.owner_id, t.title, t.start_date, t.end_date, t.status;
END; $$;

-- =============================
-- 3. (Optional) Set owner & security attributes
-- Uncomment ONLY after reviewing security implications.
-- ALTER FUNCTION public.get_trip_with_team(uuid) OWNER TO postgres; -- or service role
-- ALTER FUNCTION public.get_trip_with_team(uuid) SECURITY DEFINER;  -- if RLS blocks reads
-- REVOKE ALL ON FUNCTION public.get_trip_with_team(uuid) FROM PUBLIC; -- tighten default
-- GRANT EXECUTE ON FUNCTION public.get_trip_with_team(uuid) TO authenticated; -- allow signed-in users
-- GRANT EXECUTE ON FUNCTION public.get_trip_with_team(uuid) TO service_role; -- if needed for backend background jobs

-- =============================
-- 4. Test (manual)
-- SELECT * FROM public.get_trip_with_team('<trip_uuid>');

-- =============================
-- 5. Revert Instructions
-- To revert this migration, run:
--   DROP FUNCTION IF EXISTS public.get_trip_with_team(uuid);

-- End of migration
