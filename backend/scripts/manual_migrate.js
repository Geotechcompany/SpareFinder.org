const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runManualMigration() {
    console.log('🚀 Starting manual migration...');
    console.log('===================================');

    // Step 1: Add missing columns to part_searches
    console.log('\n📝 Step 1: Adding columns to part_searches table...');

    const alterStatements = [
        "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS similar_images JSONB DEFAULT '[]'::jsonb",
        "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS web_scraping_used BOOLEAN DEFAULT FALSE",
        "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS sites_searched INTEGER DEFAULT 0",
        "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS parts_found INTEGER DEFAULT 0",
        "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS search_query TEXT",
        "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS image_size_bytes BIGINT",
        "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS image_format TEXT",
        "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS upload_source TEXT DEFAULT 'web'",
        "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'completed'",
        "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS error_message TEXT"
    ];

    for (const statement of alterStatements) {
        try {
            console.log(`   Executing: ${statement.substring(0, 50)}...`);
            // We'll use a workaround since direct DDL isn't supported
            const { error } = await supabase.rpc('execute_sql', { sql: statement });
            if (error) {
                console.log(`   ⚠️  ${error.message}`);
            } else {
                console.log(`   ✅ Success`);
            }
        } catch (err) {
            console.log(`   ⚠️  ${err.message}`);
        }
    }

    // Step 2: Check current table structure
    console.log('\n📋 Step 2: Checking part_searches table structure...');
    try {
        const { data, error } = await supabase
            .from('part_searches')
            .select('*')
            .limit(1);

        if (error) {
            console.log(`   Error: ${error.message}`);
        } else {
            console.log(`   ✅ part_searches table accessible`);
            if (data && data.length > 0) {
                console.log(`   📊 Sample columns: ${Object.keys(data[0]).join(', ')}`);
            }
        }
    } catch (err) {
        console.log(`   Error: ${err.message}`);
    }

    // Step 3: Create user_statistics table (manual approach)
    console.log('\n🔧 Step 3: Manual table creation instructions...');
    console.log(`
📋 Please run the following SQL commands in Supabase Dashboard SQL Editor:

-- 1. Create user_statistics table
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

-- 2. Create user_search_history table
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

-- 3. Create daily_usage_stats table
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

-- 4. Enable RLS
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage_stats ENABLE ROW LEVEL SECURITY;

-- 5. Create list_tables function
CREATE OR REPLACE FUNCTION list_tables()
RETURNS TABLE (table_name TEXT) AS $$
BEGIN
    RETURN QUERY 
    SELECT tablename::TEXT 
    FROM pg_tables 
    WHERE schemaname = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `);

    console.log('\n🎯 After running the above SQL, use this to verify:');
    console.log('   node scripts/check_tables.js');
}

runManualMigration();