-- Consulta para verificar que las migraciones se ejecutaron correctamente
-- Ejecuta esto DESPUÉS de cada migración para confirmar éxito

-- 1. Verificar que la tabla profiles se creó (después de p0_minimal)
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar tablas principales (después de v141_base_consolidated)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. Verificar RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- 4. Contar registros en tablas (opcional)
SELECT 
  schemaname,
  tablename,
  n_tup_ins as "Rows Inserted",
  n_tup_upd as "Rows Updated"
FROM pg_stat_user_tables 
WHERE schemaname = 'public';

-- 5. Verificar políticas RLS creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
