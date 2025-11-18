-- Verificar si la tabla places_search_cache existe
-- Copia y pega esto en SQL Editor de Supabase

SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'places_search_cache';

-- Si no devuelve resultados, la tabla NO existe y necesitas ejecutar la migración
