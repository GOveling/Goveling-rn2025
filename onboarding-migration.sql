-- Onboarding Fields Migration for Supabase
-- Execute this SQL in the Supabase SQL Editor

-- Add onboarding completion tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS welcome_shown boolean DEFAULT false;

-- Add personal information fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('masculine', 'feminine', 'prefer_not_to_say')),
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS city_state text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '+34';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_welcome_shown ON profiles(welcome_shown);

-- Add trigger to auto-calculate age from birth_date
CREATE OR REPLACE FUNCTION calculate_age()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.birth_date IS NOT NULL THEN
    NEW.age := DATE_PART('year', AGE(NEW.birth_date));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_age
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_age();

-- Update existing profiles to have default onboarding values
UPDATE profiles 
SET 
  onboarding_completed = COALESCE(onboarding_completed, false),
  welcome_shown = COALESCE(welcome_shown, false)
WHERE onboarding_completed IS NULL OR welcome_shown IS NULL;

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
