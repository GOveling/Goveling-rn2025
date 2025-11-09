/**
 * Script to verify Supabase Storage bucket configuration
 * Run: node scripts/check-storage-bucket.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorageBucket() {
  try {
    console.log('🔍 Checking Supabase Storage configuration...\n');

    // List all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }

    console.log('📦 Available buckets:');
    if (buckets && buckets.length > 0) {
      buckets.forEach((bucket) => {
        console.log(
          `  - ${bucket.name} (${bucket.public ? 'PUBLIC' : 'PRIVATE'}) [Created: ${bucket.created_at}]`
        );
      });
    } else {
      console.log('  No buckets found');
    }

    // Check specifically for travel-documents bucket
    const travelDocsBucket = buckets?.find((b) => b.name === 'travel-documents');

    if (travelDocsBucket) {
      console.log('\n✅ travel-documents bucket exists!');
      console.log('   Public:', travelDocsBucket.public);
      console.log('   ID:', travelDocsBucket.id);
      console.log('   Created:', travelDocsBucket.created_at);

      // Try to list files in the bucket
      const { data: files, error: filesError } = await supabase.storage
        .from('travel-documents')
        .list('', { limit: 10 });

      if (filesError) {
        console.log('\n⚠️  Cannot list files in bucket:', filesError.message);
        console.log('   This might be due to RLS policies (expected if bucket is private)');
      } else {
        console.log('\n📄 Files in bucket:', files?.length || 0);
        if (files && files.length > 0) {
          files.forEach((file) => {
            console.log(`   - ${file.name}`);
          });
        }
      }
    } else {
      console.log('\n❌ travel-documents bucket NOT FOUND!');
      console.log('\n📝 To create the bucket, run this SQL in Supabase SQL Editor:');
      console.log(`
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('travel-documents', 'travel-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to upload to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'travel-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to read their own files
CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'travel-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'travel-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'travel-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
      `);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkStorageBucket();
