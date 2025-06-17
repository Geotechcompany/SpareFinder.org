-- QUICK FIX FOR IMMEDIATE ISSUES
-- Execute this in your Supabase SQL Editor

-- =============================================
-- CREATE MISSING user_achievements TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    achievement_id TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    achievement_description TEXT,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, achievement_id)
);

-- Enable RLS on the new table
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Only create policies if they don't exist
DO $$ 
BEGIN
    -- Check if policy exists, create if not
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_achievements' 
        AND policyname = 'Users can view own achievements'
    ) THEN
        CREATE POLICY "Users can view own achievements" ON user_achievements 
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_achievements' 
        AND policyname = 'System can insert achievements'
    ) THEN
        CREATE POLICY "System can insert achievements" ON user_achievements 
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- =============================================
-- FIX STORAGE BUCKET AND POLICIES
-- =============================================

-- Create the 'parts' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parts',
  'parts',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage policies only if they don't exist
DO $$ 
BEGIN
    -- Allow authenticated uploads
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname = 'Allow authenticated uploads to parts bucket'
    ) THEN
        CREATE POLICY "Allow authenticated uploads to parts bucket" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'parts' 
          AND auth.role() = 'authenticated'
        );
    END IF;
    
    -- Allow public access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname = 'Allow public access to parts bucket'
    ) THEN
        CREATE POLICY "Allow public access to parts bucket" ON storage.objects
        FOR SELECT USING (bucket_id = 'parts');
    END IF;
    
    -- Allow users to delete own parts
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname = 'Allow users to delete own parts'
    ) THEN
        CREATE POLICY "Allow users to delete own parts" ON storage.objects
        FOR DELETE USING (
          bucket_id = 'parts' 
          AND auth.uid()::text = (storage.foldername(name))[1]
        );
    END IF;
END $$;

-- =============================================
-- ADD MISSING COLUMNS
-- =============================================

ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS image_name TEXT;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS ai_model_version TEXT;

-- =============================================
-- INSERT SAMPLE ACHIEVEMENTS FOR EXISTING USERS
-- =============================================

INSERT INTO user_achievements (user_id, achievement_id, achievement_name, achievement_description)
SELECT DISTINCT
    ps.user_id,
    'first_upload',
    'First Upload',
    'Uploaded your first part'
FROM part_searches ps
WHERE NOT EXISTS (
    SELECT 1 FROM user_achievements ua 
    WHERE ua.user_id = ps.user_id AND ua.achievement_id = 'first_upload'
);

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 
    'Quick fix completed!' as status,
    (SELECT COUNT(*) FROM user_achievements) as achievements_count,
    (SELECT COUNT(*) FROM storage.buckets WHERE id = 'parts') as parts_bucket_exists; 