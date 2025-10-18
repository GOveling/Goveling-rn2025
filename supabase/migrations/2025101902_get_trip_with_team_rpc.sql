/*
  # get_trip_with_team RPC (typed + access-checked)

  Purpose:
  - Provide a single RPC to fetch trip, owner profile, collaborators list, and collaborators_count
  - Return types match client expectations to avoid 42804 (bigint vs integer) errors
  - SECURITY DEFINER with explicit access check: only owners or collaborators can fetch

  Notes:
  - collaborators_count is (collaborators + 1 for owner) cast to integer
  - owner_profile is returned as jsonb object
  - collaborators is a jsonb array of collaborator objects
*/

-- Drop previous function variants if exist to avoid signature conflicts
DROP FUNCTION IF EXISTS public.get_trip_with_team(uuid);

CREATE OR REPLACE FUNCTION public.get_trip_with_team(
  p_trip_id uuid
)
RETURNS TABLE (
  trip_id uuid,
  title text,
  owner_id uuid,
  start_date timestamptz,
  end_date timestamptz,
  status text,
  owner_profile jsonb,
  collaborators jsonb[],
  collaborators_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    t.id AS trip_id,
    t.title,
    t.owner_id,
    t.start_date,
    t.end_date,
    t.status,
    -- Owner profile as jsonb (explicit fields to avoid GROUP BY on op.*)
    jsonb_build_object(
      'id', op.id,
      'full_name', op.full_name,
      'avatar_url', op.avatar_url,
      'email', op.email
    ) AS owner_profile,
    -- Collaborators array of jsonb entries with role + basic profile fields
    COALESCE(
      array_agg(
        jsonb_build_object(
          'user_id', c.user_id,
          'role', c.role,
          'full_name', cp.full_name,
          'avatar_url', cp.avatar_url,
          'email', cp.email
        ) ORDER BY c.user_id
      ) FILTER (WHERE c.user_id IS NOT NULL),
      ARRAY[]::jsonb[]
    ) AS collaborators,
    -- Count collaborators + owner (1) and cast to integer to match TS number expectations
    ((COUNT(c.user_id)) + 1)::int AS collaborators_count
  FROM trips t
  -- Resolve owner profile via lateral join
  LEFT JOIN LATERAL (
    SELECT p.id, p.full_name, p.avatar_url, p.email
    FROM profiles p
    WHERE p.id = COALESCE(t.owner_id, t.user_id)
  ) op ON TRUE
  -- Collaborators and their profiles
  LEFT JOIN trip_collaborators c ON c.trip_id = t.id
  LEFT JOIN profiles cp ON cp.id = c.user_id
  WHERE
    t.id = p_trip_id
    AND (
      -- Access check: only owners (user_id or owner_id) or collaborators can fetch
      t.user_id = auth.uid()
      OR t.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM trip_collaborators tc2
        WHERE tc2.trip_id = t.id AND tc2.user_id = auth.uid()
      )
    )
  GROUP BY
    t.id, t.title, t.owner_id, t.start_date, t.end_date, t.status,
    op.id, op.full_name, op.avatar_url, op.email;
$$;

GRANT EXECUTE ON FUNCTION public.get_trip_with_team(uuid) TO authenticated;
