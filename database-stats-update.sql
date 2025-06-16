-- Database Updates for Dashboard Stats
-- Execute this in your Supabase SQL Editor after the main setup

-- =============================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- =============================================

-- Add image_name to part_searches for better display
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS image_name TEXT,
ADD COLUMN IF NOT EXISTS ai_model_version TEXT;

-- Add streak tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- =============================================
-- USER ACHIEVEMENTS TABLE
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

-- =============================================
-- USER STATS MATERIALIZED VIEW
-- =============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS user_stats AS
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.created_at as member_since,
    p.current_streak,
    p.longest_streak,
    
    -- Upload stats
    COALESCE(upload_stats.total_uploads, 0) as total_uploads,
    COALESCE(upload_stats.successful_uploads, 0) as successful_uploads,
    COALESCE(upload_stats.failed_uploads, 0) as failed_uploads,
    COALESCE(upload_stats.avg_confidence, 0) as avg_confidence,
    COALESCE(upload_stats.avg_processing_time, 0) as avg_processing_time,
    
    -- Monthly stats
    COALESCE(monthly_stats.uploads_this_month, 0) as uploads_this_month,
    COALESCE(monthly_stats.uploads_last_month, 0) as uploads_last_month,
    
    -- Achievements
    COALESCE(achievement_stats.total_achievements, 0) as total_achievements,
    
    -- Subscription info
    s.tier as subscription_tier,
    s.status as subscription_status,
    
    -- Usage tracking
    COALESCE(ut.searches_count, 0) as searches_this_month,
    COALESCE(ut.api_calls_count, 0) as api_calls_this_month,
    COALESCE(ut.storage_used, 0) as storage_used
    
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id
LEFT JOIN usage_tracking ut ON p.id = ut.user_id 
    AND ut.month = EXTRACT(MONTH FROM NOW()) 
    AND ut.year = EXTRACT(YEAR FROM NOW())
LEFT JOIN (
    -- Upload statistics
    SELECT 
        user_id,
        COUNT(*) as total_uploads,
        COUNT(CASE WHEN status = 'completed' AND confidence_score > 0.5 THEN 1 END) as successful_uploads,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_uploads,
        AVG(CASE WHEN confidence_score IS NOT NULL THEN confidence_score END) as avg_confidence,
        AVG(CASE WHEN processing_time IS NOT NULL THEN processing_time END) as avg_processing_time
    FROM part_searches 
    GROUP BY user_id
) upload_stats ON p.id = upload_stats.user_id
LEFT JOIN (
    -- Monthly upload statistics
    SELECT 
        user_id,
        COUNT(CASE WHEN EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW()) 
                   AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()) THEN 1 END) as uploads_this_month,
        COUNT(CASE WHEN EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW()) - 1 
                   AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()) THEN 1 END) as uploads_last_month
    FROM part_searches 
    GROUP BY user_id
) monthly_stats ON p.id = monthly_stats.user_id
LEFT JOIN (
    -- Achievement statistics
    SELECT 
        user_id,
        COUNT(*) as total_achievements
    FROM user_achievements 
    GROUP BY user_id
) achievement_stats ON p.id = achievement_stats.user_id;

-- =============================================
-- BILLING ANALYTICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS billing_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_spent DECIMAL(10,2) DEFAULT 0,
    total_saved DECIMAL(10,2) DEFAULT 0, -- Estimated savings from using the service
    plan_changes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- =============================================
-- PERFORMANCE METRICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    accuracy_rate DECIMAL(5,2), -- Daily accuracy rate
    avg_response_time INTEGER, -- Average response time in ms
    total_searches INTEGER DEFAULT 0,
    successful_searches INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- =============================================
-- FUNCTIONS FOR STATS CALCULATION
-- =============================================

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    last_activity DATE;
    current_date DATE := CURRENT_DATE;
    current_streak INTEGER;
BEGIN
    -- Get last activity date
    SELECT last_activity_date INTO last_activity FROM profiles WHERE id = p_user_id;
    
    -- Get current streak
    SELECT current_streak INTO current_streak FROM profiles WHERE id = p_user_id;
    
    IF last_activity IS NULL OR last_activity < current_date - INTERVAL '1 day' THEN
        -- Reset streak if more than 1 day gap
        IF last_activity = current_date - INTERVAL '1 day' THEN
            -- Consecutive day, increment streak
            current_streak := COALESCE(current_streak, 0) + 1;
        ELSE
            -- Gap in activity, reset streak
            current_streak := 1;
        END IF;
    ELSIF last_activity = current_date THEN
        -- Same day, no change needed
        RETURN;
    END IF;
    
    -- Update profile
    UPDATE profiles 
    SET 
        current_streak = current_streak,
        longest_streak = GREATEST(COALESCE(longest_streak, 0), current_streak),
        last_activity_date = current_date
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total savings (mock calculation)
CREATE OR REPLACE FUNCTION calculate_user_savings(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_searches INTEGER;
    estimated_savings DECIMAL;
BEGIN
    -- Get total successful searches
    SELECT COUNT(*) INTO total_searches 
    FROM part_searches 
    WHERE user_id = p_user_id AND status = 'completed' AND confidence_score > 0.7;
    
    -- Estimate savings: $2.50 per successful identification (time saved)
    estimated_savings := total_searches * 2.50;
    
    RETURN estimated_savings;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh user stats materialized view
CREATE OR REPLACE FUNCTION refresh_user_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW user_stats;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR AUTOMATIC STATS UPDATES
-- =============================================

-- Trigger to update streak when user performs an action
CREATE OR REPLACE FUNCTION trigger_update_streak()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_user_streak(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to part_searches
DROP TRIGGER IF EXISTS update_streak_on_search ON part_searches;
CREATE TRIGGER update_streak_on_search
    AFTER INSERT ON part_searches
    FOR EACH ROW EXECUTE FUNCTION trigger_update_streak();

-- Trigger to update usage tracking
CREATE OR REPLACE FUNCTION trigger_update_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Update usage tracking
    INSERT INTO usage_tracking (user_id, month, year, searches_count, api_calls_count)
    VALUES (
        NEW.user_id, 
        EXTRACT(MONTH FROM NOW()), 
        EXTRACT(YEAR FROM NOW()), 
        1, 
        1
    )
    ON CONFLICT (user_id, month, year) 
    DO UPDATE SET 
        searches_count = usage_tracking.searches_count + 1,
        api_calls_count = usage_tracking.api_calls_count + 1,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to part_searches for usage tracking
DROP TRIGGER IF EXISTS update_usage_on_search ON part_searches;
CREATE TRIGGER update_usage_on_search
    AFTER INSERT ON part_searches
    FOR EACH ROW EXECUTE FUNCTION trigger_update_usage();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_earned_at_idx ON user_achievements(earned_at);
CREATE INDEX IF NOT EXISTS billing_analytics_user_id_idx ON billing_analytics(user_id);
CREATE INDEX IF NOT EXISTS billing_analytics_date_idx ON billing_analytics(year, month);
CREATE INDEX IF NOT EXISTS performance_metrics_user_id_idx ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS performance_metrics_date_idx ON performance_metrics(date);

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Insert default achievements
INSERT INTO user_achievements (user_id, achievement_id, achievement_name, achievement_description)
SELECT 
    p.id,
    'first_upload',
    'First Upload',
    'Uploaded your first part'
FROM profiles p
WHERE EXISTS (SELECT 1 FROM part_searches ps WHERE ps.user_id = p.id)
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Initialize billing analytics for existing users
INSERT INTO billing_analytics (user_id, month, year, total_spent, total_saved)
SELECT 
    p.id,
    EXTRACT(MONTH FROM NOW()),
    EXTRACT(YEAR FROM NOW()),
    CASE 
        WHEN s.tier = 'pro' THEN 29.00
        WHEN s.tier = 'enterprise' THEN 149.00
        ELSE 0
    END,
    calculate_user_savings(p.id)
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id
ON CONFLICT (user_id, month, year) DO NOTHING;

-- Refresh the materialized view
SELECT refresh_user_stats();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for user_achievements
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert achievements" ON user_achievements FOR INSERT WITH CHECK (true);

-- Policies for billing_analytics
CREATE POLICY "Users can view own billing analytics" ON billing_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage billing analytics" ON billing_analytics FOR ALL WITH CHECK (true);

-- Policies for performance_metrics
CREATE POLICY "Users can view own performance metrics" ON performance_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage performance metrics" ON performance_metrics FOR ALL WITH CHECK (true);

-- Grant access to materialized view
GRANT SELECT ON user_stats TO authenticated; 