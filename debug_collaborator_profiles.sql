-- Script de diagnóstico y corrección para perfiles de colaboradores
-- Ejecutar línea por línea en Supabase SQL Editor

-- 1. Verificar colaboradores existentes
SELECT 
  tc.trip_id,
  tc.user_id,
  tc.role,
  p.full_name,
  p.avatar_url,
  p.email,
  au.email as auth_email,
  au.raw_user_meta_data->>'full_name' as auth_full_name,
  au.raw_user_meta_data->>'avatar_url' as auth_avatar_url
FROM trip_collaborators tc
LEFT JOIN profiles p ON tc.user_id = p.id
LEFT JOIN auth.users au ON tc.user_id = au.id
ORDER BY p.created_at DESC NULLS LAST;

-- 2. Verificar si existen perfiles faltantes
SELECT 
  tc.user_id,
  tc.role,
  CASE WHEN p.id IS NULL THEN 'PERFIL FALTANTE' ELSE 'PERFIL EXISTE' END as status
FROM trip_collaborators tc
LEFT JOIN profiles p ON tc.user_id = p.id;

-- 3. Crear/actualizar perfiles manualmente desde auth.users
INSERT INTO profiles (id, email, full_name, avatar_url, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ) as full_name,
  COALESCE(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture'
  ) as avatar_url,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.id IN (
  SELECT DISTINCT tc.user_id 
  FROM trip_collaborators tc 
  LEFT JOIN profiles p ON tc.user_id = p.id 
  WHERE p.id IS NULL
)
ON CONFLICT (id) DO UPDATE SET
  full_name = COALESCE(
    EXCLUDED.full_name,
    profiles.full_name,
    split_part(profiles.email, '@', 1)
  ),
  avatar_url = COALESCE(
    EXCLUDED.avatar_url,
    profiles.avatar_url
  ),
  updated_at = NOW();

-- 4. Actualizar perfiles existentes que tienen datos vacíos
UPDATE profiles 
SET 
  full_name = COALESCE(
    profiles.full_name,
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(profiles.email, '@', 1)
  ),
  avatar_url = COALESCE(
    profiles.avatar_url,
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture'
  ),
  updated_at = NOW()
FROM auth.users au 
WHERE profiles.id = au.id 
  AND profiles.id IN (SELECT user_id FROM trip_collaborators)
  AND (profiles.full_name IS NULL OR profiles.full_name = '' OR profiles.avatar_url IS NULL);

-- 5. Verificar resultados después de la corrección
SELECT 
  tc.trip_id,
  tc.user_id,
  tc.role,
  p.full_name,
  p.avatar_url,
  p.email,
  CASE 
    WHEN p.full_name IS NOT NULL AND p.full_name != '' THEN 'NOMBRE OK'
    ELSE 'NOMBRE FALTANTE'
  END as nombre_status
FROM trip_collaborators tc
LEFT JOIN profiles p ON tc.user_id = p.id
ORDER BY p.created_at DESC NULLS LAST;