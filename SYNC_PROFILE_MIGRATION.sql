-- ============================================
-- AUTOMATIC PROFILE SYNC: profiles -> user_profiles
-- ============================================
-- This migration creates automatic synchronization between
-- profiles table (used in Profile Tab) and user_profiles table (used in Social Feed)
-- When avatar_url or full_name changes in profiles, it automatically updates user_profiles
-- ============================================

-- Step 1: Create synchronization function
CREATE OR REPLACE FUNCTION sync_profile_to_user_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Detect changes in avatar_url or full_name
  IF (TG_OP = 'UPDATE' AND (
      OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR
      OLD.full_name IS DISTINCT FROM NEW.full_name
    )) OR (TG_OP = 'INSERT') THEN
    
    -- Check if user_profiles record exists
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = NEW.id) THEN
      -- Update existing record
      UPDATE user_profiles
      SET
        display_name = COALESCE(NEW.full_name, username),
        avatar_url = NEW.avatar_url,
        updated_at = NOW()
      WHERE id = NEW.id;
    ELSE
      -- Insert new record only if it doesn't exist
      -- Generate unique username by appending ID suffix if needed
      INSERT INTO user_profiles (
        id, 
        username, 
        display_name, 
        avatar_url, 
        updated_at
      )
      VALUES (
        NEW.id, 
        COALESCE(NEW.full_name, 'Usuario') || '_' || SUBSTRING(NEW.id::text, 1, 8),
        COALESCE(NEW.full_name, 'Usuario'),
        NEW.avatar_url,
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop old triggers if they exist
DROP TRIGGER IF EXISTS trigger_sync_avatar_to_user_profiles ON profiles;
DROP TRIGGER IF EXISTS trigger_sync_profile_to_user_profiles ON profiles;

-- Step 3: Create new trigger
CREATE TRIGGER trigger_sync_profile_to_user_profiles
  AFTER INSERT OR UPDATE OF avatar_url, full_name ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_to_user_profiles();

-- Step 4: Initial synchronization of existing data
-- This only updates existing records, does not insert new ones to avoid username conflicts
UPDATE user_profiles up
SET
  display_name = COALESCE(p.full_name, up.username),
  avatar_url = p.avatar_url,
  updated_at = NOW()
FROM profiles p
WHERE up.id = p.id;

-- Step 5: Verification queries
SELECT 
  'Sync Status' as status,
  COUNT(*) as total_profiles_synced
FROM user_profiles up
INNER JOIN profiles p ON up.id = p.id;

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
