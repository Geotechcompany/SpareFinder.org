-- Fix Missing Database Tables for SpareFinder
-- Execute this in your Supabase SQL Editor

-- =============================================
-- Create missing tables that are causing 500 errors
-- =============================================

-- 1. Create notifications table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create usage_tracking table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- 3. Create profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
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

-- 4. Create subscriptions table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create part_searches table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS part_searches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    search_term TEXT,
    part_name TEXT,
    part_number TEXT,
    manufacturer TEXT,
    confidence_score DECIMAL(5,4),
    image_url TEXT,
    image_name TEXT,
    image_size BIGINT,
    predictions JSONB DEFAULT '[]',
    processing_time_ms INTEGER,
    processing_time INTEGER,
    status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
    analysis_status TEXT DEFAULT 'completed',
    search_type TEXT DEFAULT 'image_upload',
    is_match BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create payment_methods table for Stripe configuration
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'stripe',
    api_key TEXT NOT NULL,
    secret_key TEXT,
    webhook_secret TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    test_mode BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Enable Row Level Security (RLS)
-- =============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Create RLS Policies
-- =============================================

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Usage tracking policies
DROP POLICY IF EXISTS "Users can view own usage" ON usage_tracking;
CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Part searches policies
DROP POLICY IF EXISTS "Users can view own searches" ON part_searches;
CREATE POLICY "Users can view own searches" ON part_searches
  FOR SELECT USING (auth.uid() = user_id);

-- Admin policies for payment methods
DROP POLICY IF EXISTS "Admins can manage payment methods" ON payment_methods;
CREATE POLICY "Admins can manage payment methods" ON payment_methods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- Create Indexes for Performance
-- =============================================

-- Notifications indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type);

-- Usage tracking indexes
CREATE INDEX IF NOT EXISTS usage_tracking_user_id_idx ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS usage_tracking_date_idx ON usage_tracking(year, month);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_idx ON subscriptions(stripe_customer_id);

-- Part searches indexes
CREATE INDEX IF NOT EXISTS part_searches_user_id_idx ON part_searches(user_id);
CREATE INDEX IF NOT EXISTS part_searches_created_at_idx ON part_searches(created_at);
CREATE INDEX IF NOT EXISTS part_searches_status_idx ON part_searches(status);

-- Payment methods indexes
CREATE INDEX IF NOT EXISTS payment_methods_provider_idx ON payment_methods(provider);
CREATE INDEX IF NOT EXISTS payment_methods_is_active_idx ON payment_methods(is_active);

-- =============================================
-- Create Functions
-- =============================================

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS handle_updated_at_usage_tracking ON usage_tracking;
CREATE TRIGGER handle_updated_at_usage_tracking
    BEFORE UPDATE ON usage_tracking
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_profiles ON profiles;
CREATE TRIGGER handle_updated_at_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_subscriptions ON subscriptions;
CREATE TRIGGER handle_updated_at_subscriptions
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_part_searches ON part_searches;
CREATE TRIGGER handle_updated_at_part_searches
    BEFORE UPDATE ON part_searches
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_payment_methods ON payment_methods;
CREATE TRIGGER handle_updated_at_payment_methods
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();

-- =============================================
-- Insert sample data for testing
-- =============================================

-- Insert a test Stripe configuration (update with your actual keys)
INSERT INTO payment_methods (provider, api_key, is_active, test_mode) 
VALUES ('stripe', 'sk_test_your_stripe_secret_key_here', true, true)
ON CONFLICT DO NOTHING;

-- Create usage tracking entry for current month for existing users
INSERT INTO usage_tracking (user_id, month, year, searches_count, api_calls_count, storage_used)
SELECT 
    id as user_id,
    EXTRACT(MONTH FROM NOW()) as month,
    EXTRACT(YEAR FROM NOW()) as year,
    0 as searches_count,
    0 as api_calls_count,
    0 as storage_used
FROM auth.users
ON CONFLICT (user_id, month, year) DO NOTHING;

-- Create default subscriptions for existing users
INSERT INTO subscriptions (user_id, tier, status, current_period_start, current_period_end)
SELECT 
    id as user_id,
    'free' as tier,
    'active' as status,
    NOW() as current_period_start,
    NOW() + INTERVAL '30 days' as current_period_end
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM subscriptions WHERE subscriptions.user_id = auth.users.id
);

SELECT 'Database tables created and configured successfully!' as status; 