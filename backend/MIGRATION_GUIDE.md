# Database Migration Guide for Supabase

This guide will help you migrate your database to include the enhanced user tracking and statistics features.

## 🚀 Quick Start (Recommended)

### Step 1: Generate Migration SQL
```bash
cd backend
npm run migrate:manual
```

### Step 2: Apply in Supabase Dashboard
1. Copy the generated SQL from `backend/scripts/supabase-migration.sql`
2. Go to your [Supabase Dashboard](https://app.supabase.com) → SQL Editor
3. Paste and execute the SQL

## 📋 What This Migration Adds

### Enhanced `part_searches` Table
- `similar_images` - JSONB array of similar parts found via web scraping
- `web_scraping_used` - Boolean flag for web scraping usage
- `sites_searched` - Number of sites searched
- `parts_found` - Number of similar parts found
- `search_query` - The search query used
- `image_size_bytes` - Size of uploaded image in bytes
- `image_format` - Format of uploaded image (JPEG, PNG, etc.)
- `upload_source` - Source of upload (web, mobile, api)
- `analysis_status` - Status of analysis (completed, failed, processing)
- `error_message` - Error message if analysis failed

### New `user_statistics` Table
Aggregated statistics per user:
- `total_uploads` - Total number of uploads
- `total_successful_identifications` - Successful identifications
- `total_failed_identifications` - Failed identifications
- `total_web_scraping_searches` - Web scraping usage count
- `total_similar_parts_found` - Total similar parts found
- `average_confidence_score` - Average AI confidence score
- `average_processing_time` - Average processing time
- `preferred_categories` - JSONB array of preferred part categories
- `most_searched_parts` - JSONB array of most searched parts
- `last_upload_at` - Timestamp of last upload

### New `user_search_history` Table
Detailed search tracking:
- `search_type` - Type of search (image_upload, text_search, etc.)
- `search_query` - Search query or filename
- `results_count` - Number of results returned
- `clicked_results` - JSONB array of clicked results
- `session_id` - Session identifier
- `ip_address` - User's IP address
- `user_agent` - User's browser/client information

### New `daily_usage_stats` Table
System-wide daily analytics:
- `date` - Date of statistics
- `total_uploads` - Total uploads for the day
- `total_users` - Number of active users
- `total_successful_identifications` - Successful identifications
- `total_failed_identifications` - Failed identifications
- `total_web_scraping_searches` - Web scraping usage
- `average_processing_time` - Average processing time

## 🔒 Security Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Admins can access aggregated statistics
- Proper foreign key constraints with CASCADE deletes

### Automatic Triggers
- User statistics are automatically updated on each upload
- Daily statistics are automatically calculated
- Timestamps are automatically maintained

## 🛠️ Manual Migration Steps

If you prefer to apply the migration manually:

### 1. Connect to Supabase
- Go to [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Navigate to SQL Editor

### 2. Create Migration Tracking Table
```sql
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Add New Columns to Existing Table
```sql
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
```

### 4. Create New Tables
```sql
-- User Statistics Table
CREATE TABLE IF NOT EXISTS user_statistics (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    total_uploads INTEGER DEFAULT 0,
    total_successful_identifications INTEGER DEFAULT 0,
    total_failed_identifications INTEGER DEFAULT 0,
    total_web_scraping_searches INTEGER DEFAULT 0,
    total_similar_parts_found INTEGER DEFAULT 0,
    average_confidence_score DECIMAL(5,4) DEFAULT 0.0,
    average_processing_time INTEGER DEFAULT 0,
    preferred_categories JSONB DEFAULT '[]'::jsonb,
    most_searched_parts JSONB DEFAULT '[]'::jsonb,
    last_upload_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id)
);

-- User Search History Table
CREATE TABLE IF NOT EXISTS user_search_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    part_search_id UUID REFERENCES part_searches(id) ON DELETE CASCADE,
    search_type TEXT NOT NULL DEFAULT 'image_upload',
    search_query TEXT,
    results_count INTEGER DEFAULT 0,
    clicked_results JSONB DEFAULT '[]'::jsonb,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Usage Statistics Table
CREATE TABLE IF NOT EXISTS daily_usage_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_uploads INTEGER DEFAULT 0,
    total_users INTEGER DEFAULT 0,
    total_successful_identifications INTEGER DEFAULT 0,
    total_failed_identifications INTEGER DEFAULT 0,
    total_web_scraping_searches INTEGER DEFAULT 0,
    average_processing_time DECIMAL(8,2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. Enable RLS and Create Policies
```sql
-- Enable RLS
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own statistics" ON user_statistics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own statistics" ON user_statistics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statistics" ON user_statistics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own search history" ON user_search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history" ON user_search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all daily stats" ON daily_usage_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data ->> 'role' IN ('admin', 'super_admin')
    )
  );
```

### 6. Create Indexes for Performance
```sql
CREATE INDEX IF NOT EXISTS idx_part_searches_user_id ON part_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_part_searches_created_at ON part_searches(created_at);
CREATE INDEX IF NOT EXISTS idx_part_searches_analysis_status ON part_searches(analysis_status);
CREATE INDEX IF NOT EXISTS idx_part_searches_web_scraping ON part_searches(web_scraping_used);
CREATE INDEX IF NOT EXISTS idx_user_search_history_user_id ON user_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_search_history_created_at ON user_search_history(created_at);
CREATE INDEX IF NOT EXISTS idx_user_search_history_search_type ON user_search_history(search_type);
CREATE INDEX IF NOT EXISTS idx_daily_usage_stats_date ON daily_usage_stats(date);
```

### 7. Create Automatic Update Functions
```sql
-- Function to update user statistics
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
    average_confidence_score,
    average_processing_time,
    last_upload_at,
    updated_at
  )
  SELECT 
    NEW.user_id,
    COUNT(*),
    COUNT(*) FILTER (WHERE analysis_status = 'completed'),
    COUNT(*) FILTER (WHERE analysis_status = 'failed'),
    COUNT(*) FILTER (WHERE web_scraping_used = true),
    COALESCE(SUM(parts_found), 0),
    COALESCE(AVG(confidence_score), 0),
    COALESCE(AVG(processing_time), 0),
    MAX(created_at),
    NOW()
  FROM part_searches 
  WHERE user_id = NEW.user_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_uploads = EXCLUDED.total_uploads,
    total_successful_identifications = EXCLUDED.total_successful_identifications,
    total_failed_identifications = EXCLUDED.total_failed_identifications,
    total_web_scraping_searches = EXCLUDED.total_web_scraping_searches,
    total_similar_parts_found = EXCLUDED.total_similar_parts_found,
    average_confidence_score = EXCLUDED.average_confidence_score,
    average_processing_time = EXCLUDED.average_processing_time,
    last_upload_at = EXCLUDED.last_upload_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user statistics
CREATE TRIGGER trigger_update_user_statistics
  AFTER INSERT OR UPDATE ON part_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_user_statistics();
```

### 8. Record Migration
```sql
INSERT INTO _migrations (name) VALUES ('003_enhanced_user_tracking')
ON CONFLICT (name) DO NOTHING;
```

## ✅ Verification

After running the migration, verify it worked:

### Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_statistics', 'user_search_history', 'daily_usage_stats');
```

### Check New Columns
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'part_searches' 
AND column_name IN ('similar_images', 'web_scraping_used', 'analysis_status');
```

### Test RLS Policies
```sql
-- This should work (viewing your own data)
SELECT * FROM user_statistics WHERE user_id = auth.uid();

-- This should be empty (can't see other users' data)
SELECT * FROM user_statistics WHERE user_id != auth.uid();
```

## 🚨 Troubleshooting

### Migration Already Applied
If you see "relation already exists" errors, the migration may have already been applied. Check:
```sql
SELECT * FROM _migrations WHERE name = '003_enhanced_user_tracking';
```

### Permission Errors
Ensure you're using the service role key, not the anon key:
- Go to Supabase Dashboard → Settings → API
- Use the `service_role` key, not `anon` key
- Update your `.env` file with `SUPABASE_SERVICE_KEY`

### RLS Policy Issues
If you can't access data after migration:
1. Check if RLS is enabled: `SELECT * FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;`
2. Verify policies exist: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
3. Test with service role key in SQL editor

## 📊 Using the New Features

After migration, you can:

### Get User Statistics
```javascript
const { data } = await supabase
  .from('user_statistics')
  .select('*')
  .eq('user_id', userId)
  .single();
```

### Get Search History
```javascript
const { data } = await supabase
  .from('user_search_history')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Get Daily Analytics (Admin)
```javascript
const { data } = await supabase
  .from('daily_usage_stats')
  .select('*')
  .order('date', { ascending: false });
```

## 🔄 Rollback (If Needed)

To rollback the migration:
```sql
-- Drop new tables
DROP TABLE IF EXISTS daily_usage_stats;
DROP TABLE IF EXISTS user_search_history;
DROP TABLE IF EXISTS user_statistics;

-- Remove new columns (optional)
ALTER TABLE part_searches 
DROP COLUMN IF EXISTS similar_images,
DROP COLUMN IF EXISTS web_scraping_used,
DROP COLUMN IF EXISTS sites_searched,
DROP COLUMN IF EXISTS parts_found,
DROP COLUMN IF EXISTS search_query,
DROP COLUMN IF EXISTS image_size_bytes,
DROP COLUMN IF EXISTS image_format,
DROP COLUMN IF EXISTS upload_source,
DROP COLUMN IF EXISTS analysis_status,
DROP COLUMN IF EXISTS error_message;

-- Remove migration record
DELETE FROM _migrations WHERE name = '003_enhanced_user_tracking';
```

## 🎯 Next Steps

After successful migration:
1. Update your frontend to use the new statistics endpoints
2. Test the enhanced logging functionality
3. Set up monitoring for the new analytics features
4. Consider adding dashboard visualizations for the statistics

For support, check the [DATABASE_INTEGRATION_SUMMARY.md](../DATABASE_INTEGRATION_SUMMARY.md) file. 