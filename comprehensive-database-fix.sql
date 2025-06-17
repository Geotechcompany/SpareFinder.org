-- COMPREHENSIVE DATABASE AND STORAGE FIX FOR SPAREFINDER
-- Execute this in your Supabase SQL Editor to fix all database issues

-- =============================================
-- CREATE MISSING TABLES
-- =============================================

-- User achievements table (this is missing and causing the error)
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

-- Billing analytics table
CREATE TABLE IF NOT EXISTS billing_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_spent DECIMAL(10,2) DEFAULT 0,
    total_saved DECIMAL(10,2) DEFAULT 0,
    plan_changes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    accuracy_rate DECIMAL(5,2),
    avg_response_time INTEGER,
    total_searches INTEGER DEFAULT 0,
    successful_searches INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Add missing columns to existing tables
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS image_name TEXT;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS ai_model_version TEXT;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- =============================================
-- CREATE HELPER FUNCTIONS
-- =============================================

-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate user savings
CREATE OR REPLACE FUNCTION calculate_user_savings(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_searches INTEGER;
    estimated_savings DECIMAL;
BEGIN
    SELECT COUNT(*) INTO total_searches 
    FROM part_searches 
    WHERE user_id = p_user_id AND status = 'completed' AND confidence_score > 0.7;
    
    estimated_savings := total_searches * 2.50;
    RETURN estimated_savings;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- =============================================
-- DROP EXISTING CONFLICTING POLICIES
-- =============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

DROP POLICY IF EXISTS "Users can view own searches" ON part_searches;
DROP POLICY IF EXISTS "Users can insert own searches" ON part_searches;
DROP POLICY IF EXISTS "Users can update own searches" ON part_searches;
DROP POLICY IF EXISTS "Admins can manage all searches" ON part_searches;

-- =============================================
-- CREATE RLS POLICIES FOR DATABASE TABLES
-- =============================================

-- PROFILES TABLE POLICIES
CREATE POLICY "Users can view own profile" ON profiles 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles 
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON profiles 
FOR ALL USING (is_admin());

-- PART_SEARCHES TABLE POLICIES
CREATE POLICY "Users can view own searches" ON part_searches 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own searches" ON part_searches 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own searches" ON part_searches 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all searches" ON part_searches 
FOR ALL USING (is_admin());

-- USER_ACHIEVEMENTS TABLE POLICIES
CREATE POLICY "Users can view own achievements" ON user_achievements 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements" ON user_achievements 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own achievements" ON user_achievements 
FOR UPDATE USING (auth.uid() = user_id);

-- BILLING_ANALYTICS TABLE POLICIES
CREATE POLICY "Users can view own billing analytics" ON billing_analytics 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage billing analytics" ON billing_analytics 
FOR ALL WITH CHECK (true);

-- PERFORMANCE_METRICS TABLE POLICIES
CREATE POLICY "Users can view own performance metrics" ON performance_metrics 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage performance metrics" ON performance_metrics 
FOR ALL WITH CHECK (true);

-- =============================================
-- STORAGE BUCKET SETUP
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

-- =============================================
-- STORAGE RLS POLICIES
-- =============================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated users to upload parts" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view parts" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own parts" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own parts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to parts bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to parts bucket" ON storage.objects;

-- Create new storage policies
CREATE POLICY "Allow authenticated uploads to parts bucket" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'parts' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow public access to parts bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'parts');

CREATE POLICY "Allow users to delete own parts" ON storage.objects
FOR DELETE USING (
  bucket_id = 'parts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_earned_at_idx ON user_achievements(earned_at);
CREATE INDEX IF NOT EXISTS billing_analytics_user_id_idx ON billing_analytics(user_id);
CREATE INDEX IF NOT EXISTS billing_analytics_date_idx ON billing_analytics(year, month);
CREATE INDEX IF NOT EXISTS performance_metrics_user_id_idx ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS performance_metrics_date_idx ON performance_metrics(date);

-- =============================================
-- INSERT SAMPLE DATA FOR EXISTING USERS
-- =============================================

-- Insert first upload achievement for users who already have uploads
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

-- Initialize billing analytics for existing users
INSERT INTO billing_analytics (user_id, month, year, total_spent, total_saved)
SELECT 
    p.id,
    EXTRACT(MONTH FROM NOW())::INTEGER,
    EXTRACT(YEAR FROM NOW())::INTEGER,
    0.00,
    calculate_user_savings(p.id)
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM billing_analytics ba 
    WHERE ba.user_id = p.id 
    AND ba.month = EXTRACT(MONTH FROM NOW()) 
    AND ba.year = EXTRACT(YEAR FROM NOW())
);

-- =============================================
-- GRANT NECESSARY PERMISSIONS
-- =============================================

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- =============================================
-- VERIFICATION
-- =============================================

-- Test query to ensure everything works
SELECT 
    'Database setup completed successfully!' as status,
    (SELECT COUNT(*) FROM profiles) as profiles_count,
    (SELECT COUNT(*) FROM part_searches) as searches_count,
    (SELECT COUNT(*) FROM user_achievements) as achievements_count,
    (SELECT COUNT(*) FROM storage.buckets WHERE id = 'parts') as parts_bucket_exists; 