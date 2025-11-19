-- ============================================
-- COMPLETE SYNC: Create missing user_profiles records
-- ============================================
-- This creates user_profiles records for users that exist in profiles
-- but don't have a corresponding record in user_profiles yet
-- ============================================

-- Insert missing user_profiles records
INSERT INTO user_profiles (id, username, display_name, avatar_url, bio, created_at, updated_at)
SELECT 
  p.id,
  LOWER(
    REGEXP_REPLACE(
      SUBSTRING(COALESCE(p.full_name, 'user'), 1, 10) || '_' || SUBSTRING(p.id::text, 1, 6),
      '[^a-z0-9_]', '', 'gi'
    )
  ) as username,
  COALESCE(p.full_name, 'Usuario') as display_name,
  p.avatar_url,
  p.description as bio,
  p.created_at,
  NOW() as updated_at
FROM profiles p
LEFT JOIN user_profiles up ON p.id = up.id
WHERE up.id IS NULL;

-- Verify all users are now synced
SELECT 
  p.id,
  p.full_name as profile_name,
  p.avatar_url as profile_avatar,
  up.username as userprofile_username,
  up.display_name as userprofile_displayname,
  up.avatar_url as userprofile_avatar,
  CASE 
    WHEN p.avatar_url = up.avatar_url OR (p.avatar_url IS NULL AND up.avatar_url IS NULL) 
    THEN 'Synced'
    ELSE 'Out of Sync'
  END as avatar_status
FROM profiles p
LEFT JOIN user_profiles up ON p.id = up.id
ORDER BY p.created_at DESC
LIMIT 10;
