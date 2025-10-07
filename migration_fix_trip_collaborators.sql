-- ============================================================================
-- MIGRACIÓN: Fix trip_collaborators - Agregar columnas faltantes
-- Fecha: 2025-10-06
-- Propósito: Solucionar error "column tc.status does not exist"
-- ============================================================================

-- 1. AGREGAR COLUMNAS FALTANTES A trip_collaborators
-- ============================================================================

-- Agregar la columna status que está siendo referenciada en las políticas RLS
ALTER TABLE public.trip_collaborators 
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('active', 'pending', 'inactive')) DEFAULT 'active';

-- Agregar otras columnas útiles para la funcionalidad completa
ALTER TABLE public.trip_collaborators 
ADD COLUMN IF NOT EXISTS permissions text DEFAULT 'read',
ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS invited_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. ACTUALIZAR REGISTROS EXISTENTES
-- ============================================================================

-- Asignar valores por defecto a registros existentes
UPDATE public.trip_collaborators 
SET 
  status = 'active',
  permissions = 'read',
  accepted_at = COALESCE(added_at, now()),
  updated_at = now()
WHERE status IS NULL;

-- 3. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trip_collaborators_status ON public.trip_collaborators(status);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_permissions ON public.trip_collaborators(permissions);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_invited_by ON public.trip_collaborators(invited_by);

-- 4. CREAR TRIGGER PARA ACTUALIZAR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_trip_collaborators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trip_collaborators_updated_at ON public.trip_collaborators;

CREATE TRIGGER trigger_trip_collaborators_updated_at
  BEFORE UPDATE ON public.trip_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_collaborators_updated_at();

-- 5. COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================================

COMMENT ON COLUMN public.trip_collaborators.status IS 'Estado del colaborador: active, pending, inactive';
COMMENT ON COLUMN public.trip_collaborators.permissions IS 'Permisos del colaborador: read, write, admin';
COMMENT ON COLUMN public.trip_collaborators.invited_by IS 'Usuario que invitó a este colaborador';
COMMENT ON COLUMN public.trip_collaborators.invited_at IS 'Fecha y hora de invitación';
COMMENT ON COLUMN public.trip_collaborators.accepted_at IS 'Fecha y hora de aceptación de la invitación';
COMMENT ON COLUMN public.trip_collaborators.updated_at IS 'Última fecha de actualización del registro';

-- ============================================================================
-- VERIFICACIÓN: Consultas para confirmar que la migración funcionó
-- ============================================================================

-- Verificar estructura de la tabla
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'trip_collaborators' 
-- ORDER BY ordinal_position;

-- Verificar índices creados
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'trip_collaborators';

-- Verificar triggers
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'trip_collaborators';
