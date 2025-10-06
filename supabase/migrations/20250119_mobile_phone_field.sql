-- Add mobile_phone field to profiles table
-- This is separate from the existing phone field to maintain compatibility
alter table public.profiles add column if not exists mobile_phone text;

-- Optional: Add comment for clarity
comment on column public.profiles.mobile_phone is 'Mobile phone number with country code (e.g., +34 123 456 789)';
