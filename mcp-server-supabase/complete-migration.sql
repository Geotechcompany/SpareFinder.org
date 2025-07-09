-- COMPLETE MIGRATION SCRIPT
-- Execute this in Supabase Dashboard SQL Editor

-- 1. Add missing columns to part_searches table
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS similar_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS web_scraping_used BOOLEAN DEFAULT FALSE;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS sites_searched INTEGER DEFAULT 0;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS parts_found INTEGER DEFAULT 0;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS search_query TEXT;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS image_size_bytes BIGINT;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS image_format TEXT;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS upload_source TEXT DEFAULT 'web';
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'completed';

-- 2. Create user_statistics table
CREATE TABLE IF NOT EXISTS user_statistics (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_uploads INTEGER DEFAULT 0,
    total_successful_identifications INTEGER DEFAULT 0,
    total_failed_identifications INTEGER DEFAULT 0,
    total_web_scraping_searches INTEGER DEFAULT 0,
    total_similar_parts_found INTEGER DEFAULT 0,
    average_confidence_score DECIMAL(5,4) DEFAULT 0.0000,
    average_processing_time INTEGER DEFAULT 0,
    preferred_categories JSONB DEFAULT '[]'::jsonb,
    most_searched_parts JSONB DEFAULT '[]'::jsonb,
    last_upload_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create user_search_history table
CREATE TABLE IF NOT EXISTS user_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    part_search_id TEXT REFERENCES part_searches(id) ON DELETE CASCADE,
    search_type TEXT NOT NULL,
    search_query TEXT,
    results_count INTEGER DEFAULT 0,
    clicked_results JSONB DEFAULT '[]'::jsonb,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create daily_usage_stats table
CREATE TABLE IF NOT EXISTS daily_usage_stats (
    date DATE PRIMARY KEY,
    total_uploads INTEGER DEFAULT 0,
    total_users INTEGER DEFAULT 0,
    total_successful_identifications INTEGER DEFAULT 0,
    total_web_scraping_searches INTEGER DEFAULT 0,
    average_confidence_score DECIMAL(5,4) DEFAULT 0.0000,
    average_processing_time INTEGER DEFAULT 0,
    top_categories JSONB DEFAULT '[]'::jsonb,
    top_parts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage_stats ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies
CREATE POLICY "Users can view own statistics" ON user_statistics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statistics" ON user_statistics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statistics" ON user_statistics
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own search history" ON user_search_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history" ON user_search_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Create list_tables function
CREATE OR REPLACE FUNCTION list_tables()
RETURNS TABLE (table_name TEXT) AS $$
BEGIN
    RETURN QUERY 
    SELECT tablename::TEXT 
    FROM pg_tables 
    WHERE schemaname = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_statistics_last_upload ON user_statistics(last_upload_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_search_history_user_id ON user_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_search_history_created_at ON user_search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_usage_stats_date ON daily_usage_stats(date DESC);
