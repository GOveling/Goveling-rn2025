-- ✅ QUERY DE VERIFICACIÓN POST-DEPLOYMENT
-- Ejecuta esto en el SQL Editor de Supabase para verificar que todo está correcto

-- ═══════════════════════════════════════════════════════════════════════
-- 1. VERIFICAR QUE LA TABLA EXISTE
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  schemaname,
  tablename,
  tableowner,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'recovery_codes';

-- Esperado: 1 fila con rls_enabled = true


-- ═══════════════════════════════════════════════════════════════════════
-- 2. VERIFICAR COLUMNAS DE LA TABLA
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'recovery_codes'
ORDER BY ordinal_position;

-- Esperado: 10 columnas
-- id, user_id, code_hash, sent_to_email, expires_at, is_used, used_at, attempts, max_attempts, created_at


-- ═══════════════════════════════════════════════════════════════════════
-- 3. VERIFICAR ÍNDICES
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'recovery_codes'
ORDER BY indexname;

-- Esperado: 4 índices
-- idx_recovery_codes_expires_at
-- idx_recovery_codes_is_used
-- idx_recovery_codes_user_id
-- recovery_codes_pkey (primary key)


-- ═══════════════════════════════════════════════════════════════════════
-- 4. VERIFICAR POLÍTICAS RLS
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies
WHERE tablename = 'recovery_codes'
ORDER BY policyname;

-- Esperado: 4 políticas
-- 1. Service role can manage recovery codes (ALL, service_role)
-- 2. Users can insert own recovery codes (INSERT, public)
-- 3. Users can update own recovery codes (UPDATE, public)
-- 4. Users can view own active recovery codes (SELECT, public)


-- ═══════════════════════════════════════════════════════════════════════
-- 5. VERIFICAR RELACIONES (FOREIGN KEYS)
-- ═══════════════════════════════════════════════════════════════════════
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'recovery_codes';

-- Esperado: 1 foreign key
-- user_id → auth.users(id) con ON DELETE CASCADE


-- ═══════════════════════════════════════════════════════════════════════
-- 6. VERIFICAR EDGE FUNCTION (Metadata)
-- ═══════════════════════════════════════════════════════════════════════
-- Nota: Esto no se puede verificar con SQL, debes ir al Dashboard:
-- https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions
-- 
-- Debes ver:
-- - send-recovery-email (status: active)
-- - Created: [fecha de hoy]
-- - No debe tener RESEND_API_KEY en Environment Variables


-- ═══════════════════════════════════════════════════════════════════════
-- 7. TEST: INSERTAR CÓDIGO DE PRUEBA (Opcional)
-- ═══════════════════════════════════════════════════════════════════════
-- ⚠️ Solo ejecuta esto si quieres probar la estructura
-- Reemplaza 'TU_USER_ID' con tu UUID real de auth.users

/*
INSERT INTO recovery_codes (
  user_id,
  code_hash,
  sent_to_email,
  expires_at,
  is_used,
  attempts,
  max_attempts
) VALUES (
  'TU_USER_ID',  -- ← Reemplaza con tu user_id real
  '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',  -- hash de "123456"
  'test@example.com',
  NOW() + INTERVAL '15 minutes',
  false,
  0,
  3
) RETURNING *;
*/


-- ═══════════════════════════════════════════════════════════════════════
-- 8. VER CÓDIGOS GENERADOS (Si ya probaste el flujo)
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  id,
  LEFT(user_id::text, 8) || '...' as user_id_short,
  sent_to_email,
  is_used,
  attempts,
  max_attempts,
  expires_at > NOW() as is_valid,
  EXTRACT(EPOCH FROM (expires_at - NOW()))/60 as minutes_left,
  created_at
FROM recovery_codes
ORDER BY created_at DESC
LIMIT 10;

-- Si no hay datos, significa que aún no has probado el flujo


-- ═══════════════════════════════════════════════════════════════════════
-- 9. LIMPIAR CÓDIGOS DE PRUEBA (Opcional)
-- ═══════════════════════════════════════════════════════════════════════
-- Solo ejecuta esto si quieres limpiar datos de prueba

/*
DELETE FROM recovery_codes
WHERE sent_to_email = 'test@example.com';
*/


-- ═══════════════════════════════════════════════════════════════════════
-- ✅ RESUMEN DE VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════
-- Si todos los queries anteriores retornaron los resultados esperados:
-- 
-- ✅ Tabla recovery_codes creada correctamente
-- ✅ 10 columnas con tipos correctos
-- ✅ 4 índices para performance
-- ✅ RLS habilitado
-- ✅ 4 políticas de seguridad activas
-- ✅ Foreign key a auth.users configurada
-- 
-- El sistema está listo para usar! 🎉
-- 
-- Próximo paso: Probar el flujo completo en Expo Go
-- ═══════════════════════════════════════════════════════════════════════
