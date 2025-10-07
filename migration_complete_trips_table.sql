-- ============================================================================
-- MIGRACIÓN: Completar estructura de tabla trips
-- Fecha: 2025-10-06
-- Propósito: Asegurar que todos los campos necesarios existan en trips
-- ============================================================================

-- 1. VERIFICAR Y AGREGAR COLUMNAS FALTANTES EN trips
-- ============================================================================

-- Agregar campos que podrían estar faltando
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('draft', 'active', 'completed', 'cancelled')) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS budget numeric,
ADD COLUMN IF NOT EXISTS accommodation_preference text,
ADD COLUMN IF NOT EXISTS transport_preference text,
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS privacy text CHECK (privacy IN ('public', 'private', 'friends')) DEFAULT 'private',
ADD COLUMN IF NOT EXISTS max_collaborators integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. ACTUALIZAR REGISTROS EXISTENTES
-- ============================================================================

-- Asegurar que owner_id tenga valor basado en user_id
UPDATE public.trips 
SET owner_id = user_id 
WHERE owner_id IS NULL AND user_id IS NOT NULL;

-- Asegurar que todos los trips tengan un status
UPDATE public.trips 
SET status = 'active'
WHERE status IS NULL;

-- Asegurar que timezone tenga un valor
UPDATE public.trips 
SET timezone = 'America/Santiago'
WHERE timezone IS NULL OR timezone = '';

-- 3. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_owner_id ON public.trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_privacy ON public.trips(privacy);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON public.trips(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_trips_user_status ON public.trips(user_id, status);

-- 4. CREAR TRIGGER PARA ACTUALIZAR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_trips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trips_updated_at ON public.trips;

CREATE TRIGGER trigger_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION update_trips_updated_at();

-- 5. COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================================

COMMENT ON COLUMN public.trips.status IS 'Estado del viaje: draft, active, completed, cancelled';
COMMENT ON COLUMN public.trips.description IS 'Descripción detallada del viaje';
COMMENT ON COLUMN public.trips.budget IS 'Presupuesto estimado del viaje';
COMMENT ON COLUMN public.trips.accommodation_preference IS 'Tipo de alojamiento preferido';
COMMENT ON COLUMN public.trips.transport_preference IS 'Medio de transporte preferido';
COMMENT ON COLUMN public.trips.owner_id IS 'ID del propietario del viaje (puede diferir de user_id)';
COMMENT ON COLUMN public.trips.timezone IS 'Zona horaria del viaje';
COMMENT ON COLUMN public.trips.privacy IS 'Nivel de privacidad del viaje';
COMMENT ON COLUMN public.trips.max_collaborators IS 'Número máximo de colaboradores permitidos';

-- ============================================================================
-- VERIFICACIÓN: Consultas para confirmar que la migración funcionó
-- ============================================================================

-- Verificar estructura de la tabla trips
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'trips' 
-- ORDER BY ordinal_position;

-- Verificar que no hay registros con owner_id nulo
-- SELECT COUNT(*) as registros_sin_owner
-- FROM public.trips 
-- WHERE owner_id IS NULL;
