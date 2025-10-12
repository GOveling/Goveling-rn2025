-- Migration: Setup country images in Supabase Storage
-- Date: 2025-12-09
-- Purpose: Create folder structure for country images and set up access policies

-- Create country-images folder structure in public bucket (this is conceptual, folders are created when files are uploaded)
-- The actual folder structure will be: public/country-images/{COUNTRY_CODE}.jpg

-- Add policy for country images to be publicly readable
CREATE POLICY IF NOT EXISTS "Country images public read" ON storage.objects
  FOR SELECT 
  USING (
    bucket_id = 'public' 
    AND (storage.foldername(name))[1] = 'country-images'
  );

-- Add policy for admin/service role to upload country images
CREATE POLICY IF NOT EXISTS "Country images admin upload" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'public' 
    AND (storage.foldername(name))[1] = 'country-images'
    AND auth.role() = 'service_role'
  );

-- Add comment for documentation
COMMENT ON TABLE storage.objects IS 'Includes country images in public/country-images/ folder';

-- Insert sample metadata for country images (optional - for documentation)
INSERT INTO public.country_images_metadata (country_code, image_path, description) VALUES 
  ('MX', 'country-images/MX.jpg', 'Chichen Itza - Mexico'),
  ('CL', 'country-images/CL.jpg', 'Torres del Paine - Chile'),
  ('US', 'country-images/US.jpg', 'Statue of Liberty - United States'),
  ('FR', 'country-images/FR.jpg', 'Eiffel Tower - France'),
  ('BR', 'country-images/BR.jpg', 'Christ the Redeemer - Brazil'),
  ('AR', 'country-images/AR.jpg', 'Buenos Aires - Argentina'),
  ('PE', 'country-images/PE.jpg', 'Machu Picchu - Peru'),
  ('CO', 'country-images/CO.jpg', 'Cartagena - Colombia')
ON CONFLICT (country_code) DO NOTHING;

-- Create metadata table for country images (optional)
CREATE TABLE IF NOT EXISTS public.country_images_metadata (
  country_code TEXT PRIMARY KEY,
  image_path TEXT NOT NULL,
  description TEXT,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  file_size INTEGER,
  dimensions TEXT
);

-- Add RLS policy for metadata table
ALTER TABLE public.country_images_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Country images metadata public read" ON public.country_images_metadata
  FOR SELECT 
  USING (true);

-- Grant read access to authenticated users
GRANT SELECT ON public.country_images_metadata TO authenticated;
GRANT SELECT ON public.country_images_metadata TO anon;