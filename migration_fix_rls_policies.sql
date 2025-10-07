-- ============================================================================
-- MIGRACIÓN: Recrear políticas RLS para trips y trip_collaborators
-- Fecha: 2025-10-06
-- Propósito: Solucionar problemas de RLS y referencias a columnas inexistentes
-- ============================================================================

-- 1. LIMPIAR POLÍTICAS EXISTENTES PROBLEMÁTICAS
-- ============================================================================

-- Deshabilitar RLS temporalmente para limpieza
ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_collaborators DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes que puedan tener referencias problemáticas
DROP POLICY IF EXISTS "trips_owner_full_access" ON public.trips;
DROP POLICY IF EXISTS "trips_collaborator_access" ON public.trips;
DROP POLICY IF EXISTS "trips_user_access" ON public.trips;
DROP POLICY IF EXISTS "trips_public_read" ON public.trips;
DROP POLICY IF EXISTS "trips_owner_access" ON public.trips;
DROP POLICY IF EXISTS "trips_collaborator_read" ON public.trips;

DROP POLICY IF EXISTS "trip_collaborators_owner_full_access" ON public.trip_collaborators;
DROP POLICY IF EXISTS "trip_collaborators_user_access" ON public.trip_collaborators;
DROP POLICY IF EXISTS "trip_collab_owner_rw" ON public.trip_collaborators;
DROP POLICY IF EXISTS "trip_collaborators_owner_rw" ON public.trip_collaborators;
DROP POLICY IF EXISTS "trip_collaborators_user_select" ON public.trip_collaborators;
DROP POLICY IF EXISTS "Trip owners can manage collaborators" ON public.trip_collaborators;
DROP POLICY IF EXISTS "Users can view own collaborations" ON public.trip_collaborators;
DROP POLICY IF EXISTS "collaborators_trip_owner_access" ON public.trip_collaborators;
DROP POLICY IF EXISTS "collaborators_own_access" ON public.trip_collaborators;

-- 2. CREAR POLÍTICAS RLS SIMPLES Y SEGURAS PARA TRIPS
-- ============================================================================

-- Habilitar RLS para trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Política para propietarios del viaje (basada en owner_id o user_id como fallback)
CREATE POLICY "trips_owner_access" ON public.trips
FOR ALL
TO authenticated
USING (
  COALESCE(owner_id, user_id) = auth.uid()
);

-- Política para colaboradores del viaje
CREATE POLICY "trips_collaborator_read" ON public.trips
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT tc.trip_id 
    FROM public.trip_collaborators tc 
    WHERE tc.user_id = auth.uid() 
    AND tc.status = 'active'
  )
);

-- 3. CREAR POLÍTICAS RLS SIMPLES Y SEGURAS PARA TRIP_COLLABORATORS
-- ============================================================================

-- Habilitar RLS para trip_collaborators
ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Política para propietarios del viaje
CREATE POLICY "collaborators_trip_owner_access" ON public.trip_collaborators
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
CREATE POLICY "collaborators_own_access" ON public.trip_collaborators
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 4. CREAR FUNCIÓN HELPER PARA VERIFICAR PERMISOS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_can_access_trip(trip_id uuid)
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
  
  -- Verificar si es colaborador activo
  IF EXISTS (
    SELECT 1 FROM public.trip_collaborators tc 
    WHERE tc.trip_id = trip_id 
    AND tc.user_id = auth.uid() 
    AND tc.status = 'active'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 5. FUNCIÓN HELPER PARA VERIFICAR SI ES PROPIETARIO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_owns_trip(trip_id uuid)
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

-- 6. OTORGAR PERMISOS NECESARIOS
-- ============================================================================

-- Asegurar que los usuarios autenticados puedan usar las funciones
GRANT EXECUTE ON FUNCTION public.user_can_access_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_trip(uuid) TO authenticated;

-- ============================================================================
-- VERIFICACIÓN: Consultas para confirmar que las políticas funcionan
-- ============================================================================

-- Verificar políticas de trips
-- SELECT schemaname, tablename, policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'trips';

-- Verificar políticas de trip_collaborators
-- SELECT schemaname, tablename, policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'trip_collaborators';

-- Verificar que RLS está habilitado
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename IN ('trips', 'trip_collaborators');
