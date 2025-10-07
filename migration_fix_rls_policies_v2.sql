-- ============================================================================
-- MIGRACIÓN: Recrear políticas RLS (VERSIÓN CORREGIDA)
-- Fecha: 2025-10-06
-- Propósito: Solucionar problemas de RLS - Maneja políticas existentes
-- ============================================================================

-- 1. LIMPIAR TODAS LAS POLÍTICAS EXISTENTES DE FORMA EXHAUSTIVA
-- ============================================================================

-- Deshabilitar RLS temporalmente para limpieza
ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_collaborators DISABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas existentes de trips (exhaustivo)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Eliminar todas las políticas de la tabla trips
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'trips' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trips', policy_record.policyname);
        RAISE NOTICE 'Eliminada política: %', policy_record.policyname;
    END LOOP;
    
    -- Eliminar todas las políticas de la tabla trip_collaborators
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'trip_collaborators' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trip_collaborators', policy_record.policyname);
        RAISE NOTICE 'Eliminada política: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE 'Limpieza de políticas completada exitosamente';
END $$;

-- 2. VERIFICAR QUE NO QUEDEN POLÍTICAS
-- ============================================================================

DO $$
DECLARE
    count_trips INTEGER;
    count_collaborators INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_trips FROM pg_policies WHERE tablename = 'trips' AND schemaname = 'public';
    SELECT COUNT(*) INTO count_collaborators FROM pg_policies WHERE tablename = 'trip_collaborators' AND schemaname = 'public';
    
    RAISE NOTICE 'Políticas restantes en trips: %', count_trips;
    RAISE NOTICE 'Políticas restantes en trip_collaborators: %', count_collaborators;
    
    IF count_trips > 0 OR count_collaborators > 0 THEN
        RAISE WARNING 'Aún quedan políticas. Revisar manualmente.';
    ELSE
        RAISE NOTICE 'Limpieza exitosa: No quedan políticas';
    END IF;
END $$;

-- 3. CREAR POLÍTICAS RLS NUEVAS PARA TRIPS
-- ============================================================================

-- Habilitar RLS para trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Política para propietarios del viaje (basada en owner_id o user_id como fallback)
CREATE POLICY "trips_owner_access_v2" ON public.trips
FOR ALL
TO authenticated
USING (
  COALESCE(owner_id, user_id) = auth.uid()
);

-- Política para colaboradores del viaje (solo lectura)
CREATE POLICY "trips_collaborator_read_v2" ON public.trips
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT tc.trip_id 
    FROM public.trip_collaborators tc 
    WHERE tc.user_id = auth.uid() 
    AND COALESCE(tc.status, 'active') = 'active'
  )
);

-- 4. CREAR POLÍTICAS RLS NUEVAS PARA TRIP_COLLABORATORS
-- ============================================================================

-- Habilitar RLS para trip_collaborators
ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Política para propietarios del viaje
CREATE POLICY "collaborators_trip_owner_access_v2" ON public.trip_collaborators
FOR ALL
TO authenticated
USING (
  trip_id IN (
    SELECT t.id 
    FROM public.trips t 
    WHERE COALESCE(t.owner_id, t.user_id) = auth.uid()
  )
);

-- Política para que los usuarios vean sus propias colaboraciones
CREATE POLICY "collaborators_own_access_v2" ON public.trip_collaborators
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5. CREAR FUNCIÓN HELPER MEJORADA PARA VERIFICAR PERMISOS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_can_access_trip_v2(trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar si es propietario del viaje
  IF EXISTS (
    SELECT 1 FROM public.trips t 
    WHERE t.id = trip_id 
    AND COALESCE(t.owner_id, t.user_id) = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- Verificar si es colaborador activo (con fallback para status)
  IF EXISTS (
    SELECT 1 FROM public.trip_collaborators tc 
    WHERE tc.trip_id = trip_id 
    AND tc.user_id = auth.uid() 
    AND COALESCE(tc.status, 'active') = 'active'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 6. FUNCIÓN HELPER MEJORADA PARA VERIFICAR PROPIETARIO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_owns_trip_v2(trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trips t 
    WHERE t.id = trip_id 
    AND COALESCE(t.owner_id, t.user_id) = auth.uid()
  );
END;
$$;

-- 7. OTORGAR PERMISOS NECESARIOS
-- ============================================================================

-- Asegurar que los usuarios autenticados puedan usar las funciones
GRANT EXECUTE ON FUNCTION public.user_can_access_trip_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_trip_v2(uuid) TO authenticated;

-- 8. VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
    count_trips INTEGER;
    count_collaborators INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_trips FROM pg_policies WHERE tablename = 'trips' AND schemaname = 'public';
    SELECT COUNT(*) INTO count_collaborators FROM pg_policies WHERE tablename = 'trip_collaborators' AND schemaname = 'public';
    
    RAISE NOTICE '=== VERIFICACIÓN FINAL ===';
    RAISE NOTICE 'Políticas creadas en trips: %', count_trips;
    RAISE NOTICE 'Políticas creadas en trip_collaborators: %', count_collaborators;
    
    IF count_trips >= 2 AND count_collaborators >= 2 THEN
        RAISE NOTICE 'ÉXITO: Políticas RLS configuradas correctamente';
    ELSE
        RAISE WARNING 'ADVERTENCIA: Número inesperado de políticas creadas';
    END IF;
END $$;

-- Mostrar políticas creadas
SELECT 
    'TRIPS' as tabla,
    policyname as politica_creada,
    cmd as tipo_operacion
FROM pg_policies 
WHERE tablename = 'trips' AND schemaname = 'public'

UNION ALL

SELECT 
    'TRIP_COLLABORATORS' as tabla,
    policyname as politica_creada,
    cmd as tipo_operacion
FROM pg_policies 
WHERE tablename = 'trip_collaborators' AND schemaname = 'public'
ORDER BY tabla, politica_creada;
