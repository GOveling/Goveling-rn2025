-- =====================================================
-- GOVELING SOCIAL - STORAGE CONFIGURATION
-- =====================================================
-- Created: 2025-11-18
-- Description: Storage buckets for social media content

-- =====================================================
-- BUCKET: social-media (permanent posts)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-media',
  'social-media',
  true,
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- BUCKET: social-temp (temporary pre-moderation)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-temp',
  'social-temp',
  false, -- Private bucket
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- BUCKET: avatars
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit for avatars
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES: social-media
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public images are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Anyone can view public images
CREATE POLICY "Public images are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'social-media');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'social-media' 
    AND auth.role() = 'authenticated'
  );

-- Users can update their own uploads
CREATE POLICY "Users can update their own images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'social-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own uploads
CREATE POLICY "Users can delete their own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'social-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- STORAGE POLICIES: social-temp
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload to temp" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own temp files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own temp files" ON storage.objects;

-- Users can upload to temp (private bucket)
CREATE POLICY "Users can upload to temp"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'social-temp' 
    AND auth.role() = 'authenticated'
  );

-- Users can read their own temp files
CREATE POLICY "Users can read their own temp files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'social-temp' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own temp files
CREATE POLICY "Users can delete their own temp files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'social-temp' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- STORAGE POLICIES: avatars
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Anyone can view avatars
CREATE POLICY "Avatars are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- LIFECYCLE RULES (Manual configuration needed)
-- =====================================================
-- Note: Lifecycle rules must be configured via Supabase Dashboard
-- Recommendation for social-temp bucket:
-- - Delete files older than 24 hours
-- 
-- To configure:
-- 1. Go to Storage > social-temp bucket
-- 2. Settings > Lifecycle
-- 3. Add rule: Delete files older than 1 day

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this to verify buckets were created:
-- SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id IN ('social-media', 'social-temp', 'avatars');
