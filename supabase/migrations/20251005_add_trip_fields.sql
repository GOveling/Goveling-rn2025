-- Agregar campos adicionales a la tabla trips para el modal de nuevo viaje
-- Fecha: 2025-10-05

-- Agregar columnas adicionales a la tabla trips
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS budget numeric,
ADD COLUMN IF NOT EXISTS accommodation_preference text,
ADD COLUMN IF NOT EXISTS transport_preference text,
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Actualizar registros existentes para que tengan owner_id basado en user_id
UPDATE public.trips SET owner_id = user_id WHERE owner_id IS NULL;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_trips_owner_id ON public.trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON public.trips(start_date, end_date);

-- Comentarios para documentación
COMMENT ON COLUMN public.trips.description IS 'Descripción opcional del viaje';
COMMENT ON COLUMN public.trips.budget IS 'Presupuesto del viaje en la moneda local';
COMMENT ON COLUMN public.trips.accommodation_preference IS 'Tipo de alojamiento preferido (hotel, cabin, resort, etc.)';
COMMENT ON COLUMN public.trips.transport_preference IS 'Tipo de transporte preferido (car, plane, train, etc.)';
COMMENT ON COLUMN public.trips.owner_id IS 'ID del propietario del viaje, puede ser diferente de user_id para colaboraciones';
