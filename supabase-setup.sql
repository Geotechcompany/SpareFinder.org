-- GeoTech SpareFinder - Complete Supabase Database Setup
-- Execute this in your Supabase SQL Editor

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'unpaid', 'trialing');
CREATE TYPE search_status AS ENUM ('processing', 'completed', 'failed');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    phone TEXT,
    company TEXT,
    bio TEXT,
    location TEXT,
    website TEXT,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    tier subscription_tier DEFAULT 'free',
    status subscription_status DEFAULT 'active',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- USAGE TRACKING TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    searches_count INTEGER DEFAULT 0,
    api_calls_count INTEGER DEFAULT 0,
    storage_used BIGINT DEFAULT 0,
    bandwidth_used BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- =============================================
-- PART SEARCHES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS part_searches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT,
    image_size BIGINT,
    predictions JSONB DEFAULT '[]',
    confidence_score DECIMAL(5,2),
    processing_time INTEGER, -- milliseconds
    status search_status DEFAULT 'processing',
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SEARCH ANALYTICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    search_id UUID REFERENCES part_searches(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'search_started', 'search_completed', 'result_clicked', etc.
    event_data JSONB DEFAULT '{}',
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- USER ACTIVITIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SYSTEM METRICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL,
    tags JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- API KEYS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    key_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    scopes TEXT[] DEFAULT '{}',
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FEEDBACK TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    search_id UUID REFERENCES part_searches(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    
    -- Create default subscription
    INSERT INTO public.subscriptions (user_id, tier, status)
    VALUES (NEW.id, 'free', 'active');
    
    -- Initialize usage tracking for current month
    INSERT INTO public.usage_tracking (user_id, month, year, searches_count)
    VALUES (NEW.id, EXTRACT(MONTH FROM NOW()), EXTRACT(YEAR FROM NOW()), 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage counters
CREATE OR REPLACE FUNCTION increment_usage(
    p_user_id UUID,
    p_searches INTEGER DEFAULT 0,
    p_api_calls INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO usage_tracking (user_id, month, year, searches_count, api_calls_count)
    VALUES (
        p_user_id,
        EXTRACT(MONTH FROM NOW()),
        EXTRACT(YEAR FROM NOW()),
        p_searches,
        p_api_calls
    )
    ON CONFLICT (user_id, month, year)
    DO UPDATE SET
        searches_count = usage_tracking.searches_count + p_searches,
        api_calls_count = usage_tracking.api_calls_count + p_api_calls,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_part_searches_updated_at BEFORE UPDATE ON part_searches FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all subscriptions" ON subscriptions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- Usage tracking policies
CREATE POLICY "Users can view own usage" ON usage_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert usage" ON usage_tracking FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update usage" ON usage_tracking FOR UPDATE USING (true);
CREATE POLICY "Admins can view all usage" ON usage_tracking FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- Part searches policies
CREATE POLICY "Users can manage own searches" ON part_searches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all searches" ON part_searches FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- Search analytics policies
CREATE POLICY "System can insert analytics" ON search_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own analytics" ON search_analytics FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- User activities policies
CREATE POLICY "Users can view own activities" ON user_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert activities" ON user_activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all activities" ON user_activities FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- Notifications policies
CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- API keys policies
CREATE POLICY "Users can manage own API keys" ON api_keys FOR ALL USING (auth.uid() = user_id);

-- Feedback policies
CREATE POLICY "Users can manage own feedback" ON feedback FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all feedback" ON feedback FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- System metrics (admin only)
CREATE POLICY "Admins can manage system metrics" ON system_metrics FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON profiles(created_at);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_idx ON subscriptions(stripe_customer_id);

-- Part searches indexes
CREATE INDEX IF NOT EXISTS part_searches_user_id_idx ON part_searches(user_id);
CREATE INDEX IF NOT EXISTS part_searches_created_at_idx ON part_searches(created_at);
CREATE INDEX IF NOT EXISTS part_searches_status_idx ON part_searches(status);

-- Usage tracking indexes
CREATE INDEX IF NOT EXISTS usage_tracking_user_id_idx ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS usage_tracking_date_idx ON usage_tracking(year, month);

-- Search analytics indexes
CREATE INDEX IF NOT EXISTS search_analytics_user_id_idx ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS search_analytics_search_id_idx ON search_analytics(search_id);
CREATE INDEX IF NOT EXISTS search_analytics_created_at_idx ON search_analytics(created_at);

-- User activities indexes
CREATE INDEX IF NOT EXISTS user_activities_user_id_idx ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS user_activities_created_at_idx ON user_activities(created_at);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert sample system metrics
INSERT INTO system_metrics (metric_name, metric_value, tags) VALUES
('total_users', 0, '{"type": "counter"}'),
('total_searches', 0, '{"type": "counter"}'),
('avg_processing_time', 0, '{"type": "gauge", "unit": "ms"}'),
('system_uptime', 99.9, '{"type": "gauge", "unit": "percent"}');

-- =============================================
-- STATS ENHANCEMENTS FOR DASHBOARD PAGES
-- =============================================

-- Add missing columns to existing tables
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS image_name TEXT,
ADD COLUMN IF NOT EXISTS ai_model_version TEXT;

-- Add streak tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- User achievements table
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

-- Function to calculate total savings
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

-- Enable RLS on new tables
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for new tables
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert achievements" ON user_achievements FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own billing analytics" ON billing_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage billing analytics" ON billing_analytics FOR ALL WITH CHECK (true);
CREATE POLICY "Users can view own performance metrics" ON performance_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage performance metrics" ON performance_metrics FOR ALL WITH CHECK (true);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_earned_at_idx ON user_achievements(earned_at);
CREATE INDEX IF NOT EXISTS billing_analytics_user_id_idx ON billing_analytics(user_id);
CREATE INDEX IF NOT EXISTS billing_analytics_date_idx ON billing_analytics(year, month);
CREATE INDEX IF NOT EXISTS performance_metrics_user_id_idx ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS performance_metrics_date_idx ON performance_metrics(date);

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

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'SpareFinder database setup completed successfully!';
    RAISE NOTICE 'Stats enhancements added for dashboard pages!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update your environment variables';
    RAISE NOTICE '2. Enable authentication providers in Supabase dashboard';
    RAISE NOTICE '3. Configure storage bucket for image uploads';
END $$; 