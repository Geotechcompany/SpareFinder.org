-- FIX UPLOAD RLS ISSUE - Create sparefinder bucket and proper policies
-- Execute this in your Supabase SQL Editor

-- =============================================
-- 1. CREATE SPAREFINDER STORAGE BUCKET
-- =============================================

-- Create the 'sparefinder' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sparefinder',
  'sparefinder',
  true, -- Make bucket public for easy access to uploaded images
  52428800, -- 50MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================
-- 2. DROP EXISTING STORAGE POLICIES
-- =============================================

-- Drop any existing storage policies for sparefinder bucket
DROP POLICY IF EXISTS "Allow authenticated uploads to sparefinder bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to sparefinder bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own sparefinder files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own sparefinder files" ON storage.objects;

-- =============================================
-- 3. CREATE STORAGE RLS POLICIES FOR SPAREFINDER BUCKET
-- =============================================

-- Allow authenticated users to upload to sparefinder bucket
CREATE POLICY "Allow authenticated uploads to sparefinder bucket" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'sparefinder' 
  AND auth.role() = 'authenticated'
);

-- Allow public access to view files in sparefinder bucket
CREATE POLICY "Allow public access to sparefinder bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'sparefinder');

-- Allow users to delete their own files in sparefinder bucket
CREATE POLICY "Allow users to delete own sparefinder files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'sparefinder' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own files in sparefinder bucket
CREATE POLICY "Allow users to update own sparefinder files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'sparefinder' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- 4. ENSURE PART_SEARCHES TABLE HAS PROPER RLS POLICIES
-- =============================================

-- Drop existing part_searches policies
DROP POLICY IF EXISTS "Users can view own searches" ON part_searches;
DROP POLICY IF EXISTS "Users can insert own searches" ON part_searches;
DROP POLICY IF EXISTS "Users can update own searches" ON part_searches;
DROP POLICY IF EXISTS "Admins can manage all searches" ON part_searches;

-- Create new part_searches policies
CREATE POLICY "Users can view own searches" ON part_searches 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own searches" ON part_searches 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own searches" ON part_searches 
FOR UPDATE USING (auth.uid() = user_id);

-- Create admin function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow admins to manage all searches
CREATE POLICY "Admins can manage all searches" ON part_searches 
FOR ALL USING (is_admin());

-- =============================================
-- 5. ENSURE PROFILES TABLE HAS PROPER RLS POLICIES
-- =============================================

-- Drop existing profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Create new profiles policies
CREATE POLICY "Users can view own profile" ON profiles 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles 
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON profiles 
FOR ALL USING (is_admin());

-- =============================================
-- 6. ENABLE RLS ON TABLES
-- =============================================

-- Enable RLS on all relevant tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_searches ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant access to storage for authenticated users
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Grant access to tables for authenticated users
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON part_searches TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================
-- 8. VERIFICATION
-- =============================================

-- Display verification results
DO $$
DECLARE
    sparefinder_bucket_count INTEGER;
    parts_bucket_count INTEGER;
    profiles_count INTEGER;
    searches_count INTEGER;
    storage_policies_count INTEGER;
    part_searches_policies_count INTEGER;
BEGIN
    -- Check bucket existence
    SELECT COUNT(*) INTO sparefinder_bucket_count FROM storage.buckets WHERE id = 'sparefinder';
    SELECT COUNT(*) INTO parts_bucket_count FROM storage.buckets WHERE id = 'parts';
    
    -- Check table counts
    SELECT COUNT(*) INTO profiles_count FROM profiles;
    SELECT COUNT(*) INTO searches_count FROM part_searches;
    
    -- Check policies
    SELECT COUNT(*) INTO storage_policies_count 
    FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname LIKE '%sparefinder%';
    
    SELECT COUNT(*) INTO part_searches_policies_count 
    FROM pg_policies 
    WHERE tablename = 'part_searches' 
    AND schemaname = 'public';
    
    -- Display results
    RAISE NOTICE '=== UPLOAD RLS FIX VERIFICATION ===';
    RAISE NOTICE 'Sparefinder bucket exists: %', CASE WHEN sparefinder_bucket_count > 0 THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE 'Parts bucket exists: %', CASE WHEN parts_bucket_count > 0 THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE 'Profiles count: %', profiles_count;
    RAISE NOTICE 'Searches count: %', searches_count;
    RAISE NOTICE 'Storage policies for sparefinder: %', storage_policies_count;
    RAISE NOTICE 'Part searches policies: %', part_searches_policies_count;
    
    IF sparefinder_bucket_count > 0 AND storage_policies_count >= 4 AND part_searches_policies_count >= 4 THEN
        RAISE NOTICE 'SUCCESS: Upload RLS fix completed successfully!';
    ELSE
        RAISE NOTICE 'WARNING: Some components may not be properly configured. Please review the setup.';
    END IF;
END $$; 