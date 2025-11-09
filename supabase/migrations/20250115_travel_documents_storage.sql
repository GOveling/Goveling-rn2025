-- =============================================
-- Travel Documents Storage Bucket
-- Create storage bucket and policies
-- =============================================

-- Create storage bucket for travel documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('travel-documents', 'travel-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload their own documents
CREATE POLICY "Users can upload own travel documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'travel-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own documents
CREATE POLICY "Users can view own travel documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'travel-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own travel documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'travel-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'travel-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own travel documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'travel-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
