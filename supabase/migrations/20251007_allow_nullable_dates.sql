-- Permitir fechas nulas en trips para viajes "sin fechas definidas"
-- Fecha: 2025-10-07

-- Modificar las columnas start_date y end_date para permitir valores NULL
ALTER TABLE public.trips 
ALTER COLUMN start_date DROP NOT NULL,
ALTER COLUMN end_date DROP NOT NULL;

-- Agregar comentarios para documentación
COMMENT ON COLUMN public.trips.start_date IS 'Fecha de inicio del viaje (puede ser NULL si no está definida)';
COMMENT ON COLUMN public.trips.end_date IS 'Fecha de fin del viaje (puede ser NULL si no está definida)';

-- Opcional: Agregar una columna para rastrear si el viaje tiene fechas definidas
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS has_defined_dates boolean DEFAULT true;

COMMENT ON COLUMN public.trips.has_defined_dates IS 'Indica si el viaje tiene fechas definidas o está marcado como "sin fechas"';

-- Actualizar registros existentes
UPDATE public.trips 
SET has_defined_dates = (start_date IS NOT NULL AND end_date IS NOT NULL)
WHERE has_defined_dates IS NULL OR has_defined_dates = true;
