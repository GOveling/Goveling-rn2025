-- ============================================
-- FIX USER PROFILE DATA
-- ============================================
-- Este script actualiza el username y avatar del usuario
-- para que se muestren correctamente en los posts del feed social
-- ============================================

-- Paso 1: Actualizar el username en user_profiles
UPDATE user_profiles
SET 
  username = 'Goveling Oficial',
  display_name = 'Goveling Oficial',
  bio = 'Entusiasta de los Viajes',
  updated_at = NOW()
WHERE id = '8d8d65a0-c92f-42bf-9450-22964a3640e3';

-- Paso 2: Actualizar el avatar (REEMPLAZA LA URL DESPUÉS DE SUBIRLA)
-- Descomenta y actualiza esta línea cuando tengas la URL del avatar:
-- UPDATE user_profiles
-- SET avatar_url = 'https://iwsuyrlrbmnbfyfkqowl.supabase.co/storage/v1/object/public/avatars/8d8d65a0-c92f-42bf-9450-22964a3640e3/avatar_xxxxx.jpg'
-- WHERE id = '8d8d65a0-c92f-42bf-9450-22964a3640e3';

-- Paso 3: Verificar los cambios
SELECT 
  id, 
  username, 
  display_name, 
  bio,
  avatar_url,
  created_at,
  updated_at
FROM user_profiles
WHERE id = '8d8d65a0-c92f-42bf-9450-22964a3640e3';

-- ============================================
-- OPCIONAL: También actualizar la tabla profiles
-- ============================================
-- Si quieres que el perfil principal también tenga el mismo nombre:
UPDATE profiles
SET 
  full_name = 'Goveling Oficial',
  description = 'Entusiasta de los Viajes',
  updated_at = NOW()
WHERE id = '8d8d65a0-c92f-42bf-9450-22964a3640e3';

-- Verificar profiles
SELECT 
  id, 
  email,
  full_name, 
  description,
  avatar_url,
  created_at,
  updated_at
FROM profiles
WHERE id = '8d8d65a0-c92f-42bf-9450-22964a3640e3';
