-- ============================================================================
-- MIGRACIÓN: Verificación y validación final
-- Fecha: 2025-10-06
-- Propósito: Verificar que todas las migraciones se aplicaron correctamente
-- ============================================================================

-- 1. VERIFICAR ESTRUCTURA DE TABLAS
-- ============================================================================

-- Verificar que trip_collaborators tiene todas las columnas necesarias
DO $$
DECLARE
    columnas_faltantes text[];
BEGIN
    -- Verificar columnas críticas en trip_collaborators
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_collaborators' AND column_name = 'status') THEN
        columnas_faltantes := array_append(columnas_faltantes, 'trip_collaborators.status');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_collaborators' AND column_name = 'permissions') THEN
        columnas_faltantes := array_append(columnas_faltantes, 'trip_collaborators.permissions');
    END IF;
    
    -- Verificar columnas críticas en trips
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'owner_id') THEN
        columnas_faltantes := array_append(columnas_faltantes, 'trips.owner_id');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'status') THEN
        columnas_faltantes := array_append(columnas_faltantes, 'trips.status');
    END IF;
    
    -- Reportar resultados
    IF array_length(columnas_faltantes, 1) > 0 THEN
        RAISE NOTICE 'ADVERTENCIA: Faltan las siguientes columnas: %', array_to_string(columnas_faltantes, ', ');
    ELSE
        RAISE NOTICE 'ÉXITO: Todas las columnas necesarias están presentes';
    END IF;
END $$;

-- 2. VERIFICAR POLÍTICAS RLS
-- ============================================================================

-- Mostrar políticas activas en trips
SELECT 
    'trips' as tabla,
    policyname as politica,
    cmd as comando,
    CASE WHEN qual IS NOT NULL THEN 'SÍ' ELSE 'NO' END as tiene_condiciones
FROM pg_policies 
WHERE tablename = 'trips'
ORDER BY policyname;

-- Mostrar políticas activas en trip_collaborators
SELECT 
    'trip_collaborators' as tabla,
    policyname as politica,
    cmd as comando,
    CASE WHEN qual IS NOT NULL THEN 'SÍ' ELSE 'NO' END as tiene_condiciones
FROM pg_policies 
WHERE tablename = 'trip_collaborators'
ORDER BY policyname;

-- 3. VERIFICAR ÍNDICES
-- ============================================================================

-- Verificar índices importantes
SELECT 
    'trips' as tabla,
    indexname as indice,
    CASE WHEN indexdef LIKE '%UNIQUE%' THEN 'ÚNICO' ELSE 'NORMAL' END as tipo
FROM pg_indexes 
WHERE tablename = 'trips'
AND indexname NOT LIKE '%pkey%'

UNION ALL

SELECT 
    'trip_collaborators' as tabla,
    indexname as indice,
    CASE WHEN indexdef LIKE '%UNIQUE%' THEN 'ÚNICO' ELSE 'NORMAL' END as tipo
FROM pg_indexes 
WHERE tablename = 'trip_collaborators'
AND indexname NOT LIKE '%pkey%'
ORDER BY tabla, indice;

-- 4. VERIFICAR DATOS CRÍTICOS
-- ============================================================================

-- Contar registros sin owner_id en trips
SELECT 
    'trips sin owner_id' as problema,
    COUNT(*) as cantidad
FROM public.trips 
WHERE owner_id IS NULL AND user_id IS NOT NULL

UNION ALL

-- Contar registros sin status en trip_collaborators
SELECT 
    'trip_collaborators sin status' as problema,
    COUNT(*) as cantidad
FROM public.trip_collaborators 
WHERE status IS NULL

UNION ALL

-- Contar trips activos
SELECT 
    'trips totales' as problema,
    COUNT(*) as cantidad
FROM public.trips;

-- 5. PRUEBA DE INSERCIÓN SIMULADA (SIN EJECUTAR)
-- ============================================================================

-- Esta consulta muestra qué pasaría al insertar un nuevo trip
-- NO se ejecuta realmente, solo muestra la estructura esperada
/*
EXPLAIN (FORMAT TEXT) 
INSERT INTO public.trips (
    user_id, 
    owner_id, 
    title, 
    description, 
    start_date, 
    end_date, 
    budget, 
    accommodation_preference, 
    transport_preference, 
    timezone,
    status
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid, -- user_id placeholder
    '00000000-0000-0000-0000-000000000000'::uuid, -- owner_id placeholder
    'Trip de prueba',
    'Descripción de prueba',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days',
    1000.00,
    'hotel',
    'car',
    'America/Santiago',
    'draft'
);
*/

-- 6. RESUMEN FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'VERIFICACIÓN COMPLETADA';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Revisa los resultados anteriores para confirmar que:';
    RAISE NOTICE '1. Todas las columnas necesarias existen';
    RAISE NOTICE '2. Las políticas RLS están configuradas';
    RAISE NOTICE '3. Los índices están creados';
    RAISE NOTICE '4. No hay datos inconsistentes';
    RAISE NOTICE '================================================';
END $$;
