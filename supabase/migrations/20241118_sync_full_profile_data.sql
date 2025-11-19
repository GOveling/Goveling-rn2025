-- ============================================
-- SYNC FULL USER DATA: profiles → user_profiles
-- ============================================
-- Sincroniza automáticamente nombre completo y avatar
-- de profiles a user_profiles para mantener consistencia
-- ============================================

-- Función mejorada que sincroniza todos los campos relevantes
CREATE OR REPLACE FUNCTION sync_profile_to_user_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Detectar si cambió avatar_url o full_name
  IF (TG_OP = 'UPDATE' AND (
      OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR
      OLD.full_name IS DISTINCT FROM NEW.full_name
    )) OR (TG_OP = 'INSERT') THEN
    
    -- Actualizar o insertar en user_profiles
    INSERT INTO user_profiles (
      id, 
      username, 
      display_name, 
      avatar_url, 
      updated_at
    )
    VALUES (
      NEW.id, 
      COALESCE(NEW.full_name, 'Usuario'), -- username por defecto
      COALESCE(NEW.full_name, 'Usuario'), -- display_name por defecto
      NEW.avatar_url,
      NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, user_profiles.username),
      avatar_url = EXCLUDED.avatar_url,
      updated_at = NOW();
    
    RAISE NOTICE 'Perfil sincronizado para user_id: % - Nombre: % - Avatar: %', 
      NEW.id, NEW.full_name, NEW.avatar_url;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reemplazar trigger anterior con el mejorado
DROP TRIGGER IF EXISTS trigger_sync_avatar_to_user_profiles ON profiles;
DROP TRIGGER IF EXISTS trigger_sync_profile_to_user_profiles ON profiles;

CREATE TRIGGER trigger_sync_profile_to_user_profiles
  AFTER INSERT OR UPDATE OF avatar_url, full_name ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_to_user_profiles();

-- ============================================
-- SINCRONIZACIÓN INICIAL COMPLETA
-- ============================================
-- Copiar datos existentes de profiles a user_profiles
INSERT INTO user_profiles (id, username, display_name, avatar_url, updated_at)
SELECT 
  p.id,
  COALESCE(p.full_name, 'Usuario'),
  COALESCE(p.full_name, 'Usuario'),
  p.avatar_url,
  NOW()
FROM profiles p
ON CONFLICT (id) 
DO UPDATE SET
  display_name = COALESCE(EXCLUDED.display_name, user_profiles.username),
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW();

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
  'Perfiles sincronizados' as status,
  COUNT(*) as total_sincronizados
FROM user_profiles up
INNER JOIN profiles p ON up.id = p.id;

SELECT 
  p.id,
  p.full_name as profiles_name,
  p.avatar_url as profiles_avatar,
  up.username as userprofiles_username,
  up.display_name as userprofiles_displayname,
  up.avatar_url as userprofiles_avatar
FROM profiles p
LEFT JOIN user_profiles up ON p.id = up.id
ORDER BY p.created_at DESC
LIMIT 10;
