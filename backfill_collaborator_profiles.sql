-- Backfill missing profile data from auth.users metadata
-- This will update existing profiles that have null full_name or avatar_url
-- by copying data from auth.users.user_metadata

UPDATE profiles 
SET 
  full_name = COALESCE(
    full_name,
    (au.raw_user_meta_data->>'full_name'),
    (au.raw_user_meta_data->>'name'),
    split_part(profiles.email, '@', 1)
  ),
  avatar_url = COALESCE(
    avatar_url,
    (au.raw_user_meta_data->>'avatar_url'),
    (au.raw_user_meta_data->>'picture')
  ),
  updated_at = NOW()
FROM auth.users au 
WHERE profiles.id = au.id 
  AND (profiles.full_name IS NULL OR profiles.avatar_url IS NULL);

-- Create a function to backfill profiles for collaborators
CREATE OR REPLACE FUNCTION backfill_collaborator_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create missing profiles for collaborators
  INSERT INTO profiles (id, email, full_name, avatar_url, created_at, updated_at)
  SELECT 
    tc.user_id,
    au.email,
    COALESCE(
      (au.raw_user_meta_data->>'full_name'),
      (au.raw_user_meta_data->>'name'),
      split_part(au.email, '@', 1)
    ) as full_name,
    COALESCE(
      (au.raw_user_meta_data->>'avatar_url'),
      (au.raw_user_meta_data->>'picture')
    ) as avatar_url,
    NOW(),
    NOW()
  FROM trip_collaborators tc
  JOIN auth.users au ON tc.user_id = au.id
  LEFT JOIN profiles p ON tc.user_id = p.id
  WHERE p.id IS NULL
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();
END;
$$;

-- Execute the backfill
SELECT backfill_collaborator_profiles();