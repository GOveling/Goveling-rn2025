-- Aplicar columnas faltantes para onboarding
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS welcome_shown boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('masculine', 'feminine', 'prefer_not_to_say')),
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS city_state text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS mobile_phone text,
ADD COLUMN IF NOT EXISTS country_code text;

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_welcome_shown ON profiles(welcome_shown);

-- Función para calcular edad
CREATE OR REPLACE FUNCTION calculate_age()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.birth_date IS NOT NULL THEN
    NEW.age := DATE_PART('year', AGE(NEW.birth_date));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular edad automáticamente
DROP TRIGGER IF EXISTS trigger_calculate_age ON profiles;
CREATE TRIGGER trigger_calculate_age
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_age();

-- Actualizar usuarios existentes para tener onboarding_completed = true por defecto
UPDATE profiles 
SET onboarding_completed = true, welcome_shown = true 
WHERE onboarding_completed IS NULL OR welcome_shown IS NULL;
