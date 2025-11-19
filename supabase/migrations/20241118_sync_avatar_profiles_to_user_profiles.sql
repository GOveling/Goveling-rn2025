-- ============================================
-- SYNC AVATAR: profiles → user_profiles
-- ============================================
-- Cuando se actualiza el avatar en profiles (Tab Profile),
-- automáticamente se actualiza en user_profiles (para los posts)
-- ============================================

-- Función que sincroniza el avatar
CREATE OR REPLACE FUNCTION sync_avatar_to_user_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualizar si el avatar_url cambió
  IF (TG_OP = 'UPDATE' AND OLD.avatar_url IS DISTINCT FROM NEW.avatar_url) 
     OR (TG_OP = 'INSERT') THEN
    
    -- Actualizar o insertar en user_profiles
    INSERT INTO user_profiles (id, avatar_url, updated_at)
    VALUES (NEW.id, NEW.avatar_url, NOW())
    ON CONFLICT (id) 
    DO UPDATE SET
      avatar_url = EXCLUDED.avatar_url,
      updated_at = NOW();
    
    RAISE NOTICE 'Avatar sincronizado para user_id: % - URL: %', NEW.id, NEW.avatar_url;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que ejecuta la función cuando se actualiza profiles
DROP TRIGGER IF EXISTS trigger_sync_avatar_to_user_profiles ON profiles;
CREATE TRIGGER trigger_sync_avatar_to_user_profiles
  AFTER INSERT OR UPDATE OF avatar_url ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_avatar_to_user_profiles();

-- ============================================
-- SINCRONIZACIÓN INICIAL (para avatares existentes)
-- ============================================
-- Copiar avatares existentes de profiles a user_profiles
INSERT INTO user_profiles (id, avatar_url, updated_at)
SELECT 
  p.id,
  p.avatar_url,
  NOW()
FROM profiles p
WHERE p.avatar_url IS NOT NULL
ON CONFLICT (id) 
DO UPDATE SET
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW();

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ver avatares sincronizados
SELECT 
  'profiles' as source,
  id,
  email,
  full_name,
  avatar_url
FROM profiles
WHERE avatar_url IS NOT NULL
UNION ALL
SELECT 
  'user_profiles' as source,
  id,
  'N/A' as email,
  username as full_name,
  avatar_url
FROM user_profiles
WHERE avatar_url IS NOT NULL
ORDER BY id, source;
