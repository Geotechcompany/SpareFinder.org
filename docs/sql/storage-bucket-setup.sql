-- Storage Bucket Setup for SpareFinder
-- Run this in your Supabase SQL Editor AFTER running fix-rls.sql

-- =============================================
-- CREATE STORAGE BUCKET
-- =============================================

-- Insert the 'parts' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parts',
  'parts',
  true, -- Make bucket public for easy access to uploaded images
  52428800, -- 50MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================
-- VERIFY BUCKET POLICIES
-- =============================================

-- The bucket policies are already created in fix-rls.sql, but let's verify they exist
-- Check if storage policies exist
DO $$
BEGIN
  -- Check if the upload policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can upload their own files'
  ) THEN
    RAISE NOTICE 'Storage upload policy missing - please run fix-rls.sql first';
  ELSE
    RAISE NOTICE 'Storage policies are properly configured';
  END IF;
END $$; 