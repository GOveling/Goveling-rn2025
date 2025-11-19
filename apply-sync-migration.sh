#!/bin/bash

# Script para aplicar sincronización automática de avatar y username
# Este script sincroniza profiles → user_profiles

echo "🚀 Aplicando sincronización automática de perfiles..."
echo ""
echo "📋 Este script creará:"
echo "   1. Función sync_profile_to_user_profiles()"
echo "   2. Trigger automático en profiles"
echo "   3. Sincronización inicial de datos existentes"
echo ""
echo "⚠️  IMPORTANTE: Copia y pega el siguiente SQL en:"
echo "   https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/sql/new"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
cat << 'EOF'

-- ============================================
-- SYNC AVATAR Y USERNAME AUTOMÁTICO
-- profiles → user_profiles
-- ============================================

-- 1. Crear función de sincronización
CREATE OR REPLACE FUNCTION sync_profile_to_user_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Detectar cambios en avatar_url o full_name
  IF (TG_OP = 'UPDATE' AND (
      OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR
      OLD.full_name IS DISTINCT FROM NEW.full_name
    )) OR (TG_OP = 'INSERT') THEN
    
    -- Actualizar user_profiles automáticamente
    INSERT INTO user_profiles (
      id, 
      username, 
      display_name, 
      avatar_url, 
      updated_at
    )
    VALUES (
      NEW.id, 
      COALESCE(NEW.full_name, 'Usuario'),
      COALESCE(NEW.full_name, 'Usuario'),
      NEW.avatar_url,
      NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, user_profiles.username),
      avatar_url = EXCLUDED.avatar_url,
      updated_at = NOW();
    
    RAISE NOTICE 'Perfil sincronizado: % - %', NEW.id, NEW.full_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear trigger automático
DROP TRIGGER IF EXISTS trigger_sync_avatar_to_user_profiles ON profiles;
DROP TRIGGER IF EXISTS trigger_sync_profile_to_user_profiles ON profiles;

CREATE TRIGGER trigger_sync_profile_to_user_profiles
  AFTER INSERT OR UPDATE OF avatar_url, full_name ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_to_user_profiles();

-- 3. Sincronización inicial de datos existentes
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

-- 4. Verificación
SELECT 
  'Verificación de sincronización' as status,
  COUNT(*) as perfiles_sincronizados
FROM user_profiles up
INNER JOIN profiles p ON up.id = p.id;

SELECT 
  p.id,
  p.full_name as profiles_name,
  p.avatar_url as profiles_avatar,
  up.username,
  up.display_name,
  up.avatar_url as userprofiles_avatar,
  CASE 
    WHEN p.avatar_url = up.avatar_url THEN '✅ Sincronizado'
    ELSE '⚠️ Desincronizado'
  END as estado_avatar
FROM profiles p
LEFT JOIN user_profiles up ON p.id = up.id
WHERE p.id = '8d8d65a0-c92f-42bf-9450-22964a3640e3';

EOF
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "📝 INSTRUCCIONES:"
echo "   1. Copia TODO el SQL anterior (desde -- ==== hasta el final)"
echo "   2. Ve a: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/sql/new"
echo "   3. Pega el SQL"
echo "   4. Click en 'Run'"
echo ""
echo "✨ Después de esto, cada vez que actualices tu avatar en la app,"
echo "   se actualizará AUTOMÁTICAMENTE en tus posts!"
echo ""
