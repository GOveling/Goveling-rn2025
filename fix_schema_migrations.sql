-- Script para limpiar entradas duplicadas en schema_migrations
-- Este script debe ejecutarse en el SQL Editor de Supabase Dashboard

-- 1. Ver las entradas duplicadas actuales
SELECT version, COUNT(*) as count
FROM supabase_migrations.schema_migrations
GROUP BY version
HAVING COUNT(*) > 1
ORDER BY version;

-- 2. Eliminar TODAS las entradas de la tabla schema_migrations
-- ADVERTENCIA: Esto borrará todo el historial de migraciones
-- Solo hazlo si estás seguro de que quieres empezar de cero
-- DELETE FROM supabase_migrations.schema_migrations;

-- 3. (Alternativa más segura) Eliminar solo duplicados manteniendo una entrada
-- Esto mantiene la primera entrada de cada versión y elimina las demás
DELETE FROM supabase_migrations.schema_migrations
WHERE ctid NOT IN (
    SELECT MIN(ctid)
    FROM supabase_migrations.schema_migrations
    GROUP BY version
);

-- 4. Verificar que no haya duplicados
SELECT version, COUNT(*) as count
FROM supabase_migrations.schema_migrations
GROUP BY version
HAVING COUNT(*) > 1
ORDER BY version;

-- 5. Ver todas las migraciones restantes
SELECT version, inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version;
