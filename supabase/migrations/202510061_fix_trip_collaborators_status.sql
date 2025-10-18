-- Fix trip_collaborators table - Add missing status column
-- Fecha: 2025-10-06

-- Agregar la columna status que falta en trip_collaborators
ALTER TABLE public.trip_collaborators 
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('active', 'pending', 'inactive')) DEFAULT 'active';

-- Agregar índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_status ON public.trip_collaborators(status);

-- Agregar otras columnas que podrían ser útiles para trip_collaborators
ALTER TABLE public.trip_collaborators 
ADD COLUMN IF NOT EXISTS permissions text DEFAULT 'read',
ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS invited_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Actualizar registros existentes
UPDATE public.trip_collaborators 
SET status = 'active', 
    permissions = 'read', 
    accepted_at = added_at
WHERE status IS NULL;

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_trip_collaborators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_trip_collaborators_updated_at
  BEFORE UPDATE ON public.trip_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_collaborators_updated_at();

-- Comentarios para documentación
COMMENT ON COLUMN public.trip_collaborators.status IS 'Estado del colaborador: active, pending, inactive';
COMMENT ON COLUMN public.trip_collaborators.permissions IS 'Permisos del colaborador en el viaje';
COMMENT ON COLUMN public.trip_collaborators.invited_by IS 'Usuario que invitó a este colaborador';
COMMENT ON COLUMN public.trip_collaborators.invited_at IS 'Fecha de invitación';
COMMENT ON COLUMN public.trip_collaborators.accepted_at IS 'Fecha de aceptación de la invitación';
