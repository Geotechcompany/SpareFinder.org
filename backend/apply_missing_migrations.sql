-- Apply Missing Database Migrations
-- Run this SQL in the Supabase Dashboard SQL Editor

-- ================================================
-- 1. Add missing columns to part_searches table
-- ================================================

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS similar_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS web_scraping_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sites_searched INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS parts_found INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS search_query TEXT,
ADD COLUMN IF NOT EXISTS image_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS image_format TEXT,
ADD COLUMN IF NOT EXISTS upload_source TEXT DEFAULT 'web',
ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- ================================================
-- 2. Create user_statistics table
-- ================================================

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

-- ================================================
-- 3. Create user_search_history table
-- ================================================

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

-- ================================================
-- 4. Create daily_usage_stats table
-- ================================================

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

-- ================================================
-- 5. Create indexes for better performance
-- ================================================

CREATE INDEX IF NOT EXISTS idx_part_searches_web_scraping ON part_searches(web_scraping_used);
CREATE INDEX IF NOT EXISTS idx_part_searches_analysis_status ON part_searches(analysis_status);
CREATE INDEX IF NOT EXISTS idx_part_searches_upload_source ON part_searches(upload_source);
CREATE INDEX IF NOT EXISTS idx_user_statistics_last_upload ON user_statistics(last_upload_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_search_history_user_id ON user_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_search_history_created_at ON user_search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_search_history_search_type ON user_search_history(search_type);
CREATE INDEX IF NOT EXISTS idx_daily_usage_stats_date ON daily_usage_stats(date DESC);

-- ================================================
-- 6. Enable RLS for new tables
-- ================================================

ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage_stats ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 7. Create RLS Policies
-- ================================================

-- RLS Policies for user_statistics
CREATE POLICY "Users can view own statistics" ON user_statistics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statistics" ON user_statistics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statistics" ON user_statistics
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_search_history
CREATE POLICY "Users can view own search history" ON user_search_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history" ON user_search_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_usage_stats (admin only)
CREATE POLICY "Admins can view daily stats" ON daily_usage_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid() = id 
            AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
        )
    );

-- ================================================
-- 8. Create function to list tables
-- ================================================

CREATE OR REPLACE FUNCTION list_tables()
RETURNS TABLE (table_name TEXT) AS $$
BEGIN
    RETURN QUERY 
    SELECT tablename::TEXT 
    FROM pg_tables 
    WHERE schemaname = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 9. Create triggers for automatic statistics updates
-- ================================================

CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_statistics (
        user_id,
        total_uploads,
        total_successful_identifications,
        total_failed_identifications,
        total_web_scraping_searches,
        total_similar_parts_found,
        last_upload_at
    ) VALUES (
        NEW.user_id,
        1,
        CASE WHEN NEW.analysis_status = 'completed' AND jsonb_array_length(COALESCE(NEW.predictions, '[]'::jsonb)) > 0 THEN 1 ELSE 0 END,
        CASE WHEN NEW.analysis_status = 'failed' THEN 1 ELSE 0 END,
        CASE WHEN NEW.web_scraping_used THEN 1 ELSE 0 END,
        COALESCE(jsonb_array_length(COALESCE(NEW.similar_images, '[]'::jsonb)), 0),
        NEW.created_at
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_uploads = user_statistics.total_uploads + 1,
        total_successful_identifications = user_statistics.total_successful_identifications + 
            CASE WHEN NEW.analysis_status = 'completed' AND jsonb_array_length(COALESCE(NEW.predictions, '[]'::jsonb)) > 0 THEN 1 ELSE 0 END,
        total_failed_identifications = user_statistics.total_failed_identifications + 
            CASE WHEN NEW.analysis_status = 'failed' THEN 1 ELSE 0 END,
        total_web_scraping_searches = user_statistics.total_web_scraping_searches + 
            CASE WHEN NEW.web_scraping_used THEN 1 ELSE 0 END,
        total_similar_parts_found = user_statistics.total_similar_parts_found + 
            COALESCE(jsonb_array_length(COALESCE(NEW.similar_images, '[]'::jsonb)), 0),
        last_upload_at = NEW.created_at,
        updated_at = NOW();

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for part_searches
DROP TRIGGER IF EXISTS update_user_statistics_trigger ON part_searches;
CREATE TRIGGER update_user_statistics_trigger 
    AFTER INSERT ON part_searches 
    FOR EACH ROW EXECUTE FUNCTION update_user_statistics();

-- Create function to update daily usage stats
CREATE OR REPLACE FUNCTION update_daily_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO daily_usage_stats (
        date,
        total_uploads,
        total_users,
        total_successful_identifications,
        total_web_scraping_searches
    ) VALUES (
        DATE(NEW.created_at),
        1,
        1,
        CASE WHEN NEW.analysis_status = 'completed' AND jsonb_array_length(COALESCE(NEW.predictions, '[]'::jsonb)) > 0 THEN 1 ELSE 0 END,
        CASE WHEN NEW.web_scraping_used THEN 1 ELSE 0 END
    )
    ON CONFLICT (date) DO UPDATE SET
        total_uploads = daily_usage_stats.total_uploads + 1,
        total_users = (
            SELECT COUNT(DISTINCT user_id) 
            FROM part_searches 
            WHERE DATE(created_at) = DATE(NEW.created_at)
        ),
        total_successful_identifications = daily_usage_stats.total_successful_identifications + 
            CASE WHEN NEW.analysis_status = 'completed' AND jsonb_array_length(COALESCE(NEW.predictions, '[]'::jsonb)) > 0 THEN 1 ELSE 0 END,
        total_web_scraping_searches = daily_usage_stats.total_web_scraping_searches + 
            CASE WHEN NEW.web_scraping_used THEN 1 ELSE 0 END,
        updated_at = NOW();

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for daily stats
DROP TRIGGER IF EXISTS update_daily_usage_stats_trigger ON part_searches;
CREATE TRIGGER update_daily_usage_stats_trigger 
    AFTER INSERT ON part_searches 
    FOR EACH ROW EXECUTE FUNCTION update_daily_usage_stats();

-- Add updated_at triggers for new tables
DROP TRIGGER IF EXISTS update_user_statistics_updated_at ON user_statistics;
CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE
    ON user_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_usage_stats_updated_at ON daily_usage_stats;
CREATE TRIGGER update_daily_usage_stats_updated_at BEFORE UPDATE
    ON daily_usage_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Migration completed!
-- ================================================ 