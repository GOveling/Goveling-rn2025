-- Add mobile_phone and country_code fields to profiles table
-- These are separate from the existing phone field to maintain compatibility

-- Add mobile_phone column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile_phone text;

-- Add country_code column (for phone number prefix like +34, +52, etc.)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code text;

-- Add comments for clarity
COMMENT ON COLUMN public.profiles.mobile_phone IS 'Mobile phone number without country code (e.g., 123 456 789)';
COMMENT ON COLUMN public.profiles.country_code IS 'Country code prefix for mobile phone (e.g., +34, +52)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('phone', 'mobile_phone', 'country_code')
ORDER BY column_name;
