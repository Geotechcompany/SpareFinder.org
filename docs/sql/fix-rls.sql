-- COMPREHENSIVE DATABASE AND STORAGE FIX
-- Execute this in your Supabase SQL Editor

-- =============================================
-- DROP EXISTING POLICIES (CLEAN SLATE)
-- =============================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

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
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS image_name TEXT,
ADD COLUMN IF NOT EXISTS ai_model_version TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE;

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

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    last_activity DATE;
    current_date DATE := CURRENT_DATE;
    current_streak INTEGER;
BEGIN
    SELECT last_activity_date INTO last_activity FROM profiles WHERE id = p_user_id;
    SELECT current_streak INTO current_streak FROM profiles WHERE id = p_user_id;
    
    IF last_activity IS NULL OR last_activity < current_date - INTERVAL '1 day' THEN
        IF last_activity = current_date - INTERVAL '1 day' THEN
            current_streak := COALESCE(current_streak, 0) + 1;
        ELSE
            current_streak := 1;
        END IF;
    ELSIF last_activity = current_date THEN
        RETURN;
    END IF;
    
    UPDATE profiles 
    SET 
        current_streak = current_streak,
        longest_streak = GREATEST(COALESCE(longest_streak, 0), current_streak),
        last_activity_date = current_date
    WHERE id = p_user_id;
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
-- DATABASE TABLE RLS POLICIES
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

CREATE POLICY "Admins can manage all achievements" ON user_achievements 
FOR ALL USING (is_admin());

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
  true, -- Make bucket public for easy access to uploaded images
  52428800, -- 50MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================
-- STORAGE RLS POLICIES
-- =============================================

-- DROP ANY EXISTING STORAGE POLICIES
DROP POLICY IF EXISTS "Allow authenticated users to upload parts" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view parts" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own parts" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own parts" ON storage.objects;

-- STORAGE BUCKET POLICIES FOR 'parts' BUCKET
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

CREATE POLICY "Allow users to update own parts" ON storage.objects
FOR UPDATE USING (
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
-- CREATE TRIGGERS
-- =============================================

-- Trigger to update streak when user performs an action
CREATE OR REPLACE FUNCTION trigger_update_streak()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_user_streak(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_streak_on_search ON part_searches;
CREATE TRIGGER update_streak_on_search
    AFTER INSERT ON part_searches
    FOR EACH ROW EXECUTE FUNCTION trigger_update_streak();

-- =============================================
-- INSERT SAMPLE ACHIEVEMENTS FOR EXISTING USERS
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
    CASE 
        WHEN s.tier = 'pro' THEN 29.00
        WHEN s.tier = 'enterprise' THEN 149.00
        ELSE 0
    END,
    calculate_user_savings(p.id)
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id
ON CONFLICT (user_id, month, year) DO NOTHING;

-- =============================================
-- VERIFY SETUP
-- =============================================

-- Display table counts to verify everything is working
DO $$
DECLARE
    profiles_count INTEGER;
    searches_count INTEGER;
    achievements_count INTEGER;
    bucket_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profiles_count FROM profiles;
    SELECT COUNT(*) INTO searches_count FROM part_searches;
    SELECT COUNT(*) INTO achievements_count FROM user_achievements;
    SELECT COUNT(*) INTO bucket_count FROM storage.buckets WHERE id = 'parts';
    
    RAISE NOTICE 'Setup Complete!';
    RAISE NOTICE 'Profiles: %', profiles_count;
    RAISE NOTICE 'Searches: %', searches_count;
    RAISE NOTICE 'Achievements: %', achievements_count;
    RAISE NOTICE 'Parts bucket exists: %', CASE WHEN bucket_count > 0 THEN 'YES' ELSE 'NO' END;
END $$;

-- =============================================
-- GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant access to tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant access to storage
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated; 