-- Function to get trip title and inviter name for invitations
-- This bypasses RLS by running with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_invitation_enrichment(
  p_trip_ids uuid[],
  p_inviter_ids uuid[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- Get trip titles and inviter names in one query
  SELECT json_build_object(
    'trips', (
      SELECT json_object_agg(id::text, title)
      FROM trips
      WHERE id = ANY(p_trip_ids)
    ),
    'inviters', (
      SELECT json_object_agg(id::text, COALESCE(full_name, email, 'Usuario'))
      FROM profiles
      WHERE id = ANY(p_inviter_ids)
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_invitation_enrichment(uuid[], uuid[]) 
TO authenticated;

COMMENT ON FUNCTION public.get_invitation_enrichment(uuid[], uuid[]) IS 
'Returns trip titles and inviter names for invitation enrichment. Bypasses RLS.';
