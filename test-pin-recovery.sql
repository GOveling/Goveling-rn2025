-- =============================================
-- SCRIPT DE PRUEBA: Recuperación de PIN
-- Verifica que el sistema funcione correctamente
-- =============================================

-- 1️⃣ Verificar políticas RLS aplicadas
SELECT 
  '=== POLÍTICAS RLS ===' as seccion,
  policyname as politica,
  cmd as operacion,
  roles as rol,
  CASE 
    WHEN roles = '{service_role}' THEN '✅ Edge Function'
    WHEN roles = '{authenticated}' THEN '✅ Usuario'
    ELSE '⚠️ Otro'
  END as tipo
FROM pg_policies
WHERE tablename = 'recovery_codes'
ORDER BY policyname;

-- 2️⃣ Verificar que RLS está habilitado
SELECT 
  '=== ESTADO RLS ===' as seccion,
  tablename as tabla,
  CASE 
    WHEN rowsecurity THEN '✅ RLS HABILITADO'
    ELSE '❌ RLS DESHABILITADO'
  END as estado
FROM pg_tables
WHERE tablename = 'recovery_codes';

-- 3️⃣ Ver códigos de recuperación existentes (últimos 5)
SELECT 
  '=== CÓDIGOS RECIENTES ===' as seccion,
  id,
  user_id,
  sent_to_email as email,
  is_used as usado,
  attempts as intentos,
  expires_at as expira,
  created_at as creado,
  CASE 
    WHEN expires_at > NOW() AND NOT is_used THEN '✅ ACTIVO'
    WHEN expires_at <= NOW() THEN '⏰ EXPIRADO'
    WHEN is_used THEN '✓ USADO'
  END as estado
FROM recovery_codes
ORDER BY created_at DESC
LIMIT 5;

-- 4️⃣ Contar códigos por usuario
SELECT 
  '=== RESUMEN POR USUARIO ===' as seccion,
  user_id,
  COUNT(*) as total_codigos,
  COUNT(*) FILTER (WHERE is_used = false AND expires_at > NOW()) as activos,
  COUNT(*) FILTER (WHERE is_used = true) as usados,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expirados
FROM recovery_codes
GROUP BY user_id
ORDER BY total_codigos DESC
LIMIT 5;

-- 5️⃣ Verificar constraint único
SELECT 
  '=== CONSTRAINTS ===' as seccion,
  conname as constraint_nombre,
  pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'recovery_codes'::regclass
  AND contype = 'u'
ORDER BY conname;

-- =============================================
-- RESULTADO ESPERADO:
-- =============================================
-- ✅ 3 políticas RLS (service_role + 2 authenticated)
-- ✅ RLS habilitado
-- ✅ Constraint único: (user_id, is_used)
-- ✅ No códigos activos duplicados por usuario
-- =============================================
