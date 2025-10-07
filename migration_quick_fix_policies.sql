-- ============================================================================
-- MIGRACIÓN: Limpieza rápida de políticas RLS problemáticas
-- Fecha: 2025-10-06
-- Propósito: Solución simple para el error de políticas duplicadas
-- ============================================================================

-- OPCIÓN 1: Solo limpiar todas las políticas y crear las básicas
-- ============================================================================

-- Paso 1: Eliminar TODAS las políticas existentes de forma segura
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE 'Iniciando limpieza de políticas...';
    
    -- Limpiar políticas de trips
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'trips' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.trips', policy_record.policyname);
        RAISE NOTICE 'Eliminada política de trips: %', policy_record.policyname;
    END LOOP;
    
    -- Limpiar políticas de trip_collaborators  
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'trip_collaborators' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.trip_collaborators', policy_record.policyname);
        RAISE NOTICE 'Eliminada política de trip_collaborators: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE 'Limpieza completada exitosamente';
END $$;

-- Paso 2: Crear políticas básicas y funcionales
-- ============================================================================

-- Asegurar que RLS esté habilitado
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Política básica para trips: solo el propietario puede acceder
CREATE POLICY "basic_trips_owner_access" ON public.trips
FOR ALL
TO authenticated  
USING (COALESCE(owner_id, user_id) = auth.uid());

-- Política básica para trip_collaborators: solo propietarios del trip
CREATE POLICY "basic_collaborators_access" ON public.trip_collaborators  
FOR ALL
TO authenticated
USING (
  trip_id IN (
    SELECT t.id FROM public.trips t 
    WHERE COALESCE(t.owner_id, t.user_id) = auth.uid()
  )
);

-- Política para que usuarios vean sus propias colaboraciones
CREATE POLICY "basic_own_collaborations" ON public.trip_collaborators
FOR SELECT  
TO authenticated
USING (user_id = auth.uid());

-- Paso 3: Verificación
-- ============================================================================
SELECT 
  tablename,
  policyname,
  cmd as operaciones_permitidas
FROM pg_policies 
WHERE tablename IN ('trips', 'trip_collaborators') 
AND schemaname = 'public'
ORDER BY tablename, policyname;
