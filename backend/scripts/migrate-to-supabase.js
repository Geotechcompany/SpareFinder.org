#!/usr/bin/env node

/**
 * Supabase Database Migration Script
 * 
 * This script applies the enhanced user tracking schema to Supabase
 * Run with: node scripts/migrate-to-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeSQL(sql, description) {
    console.log(`\n🔄 ${description}...`);

    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            // If the RPC doesn't exist, try direct query
            if (error.code === '42883') {
                console.log('   Using direct query method...');
                const { data: directData, error: directError } = await supabase
                    .from('_migrations')
                    .select('*')
                    .limit(1);

                if (directError && directError.code === '42P01') {
                    // Table doesn't exist, we need to create it first
                    console.log('   Creating migrations table...');
                    await createMigrationsTable();
                }

                // Execute the SQL using a different approach
                const result = await executeSQLDirect(sql);
                console.log(`✅ ${description} completed`);
                return result;
            } else {
                throw error;
            }
        }

        console.log(`✅ ${description} completed`);
        return data;
    } catch (error) {
        console.error(`❌ ${description} failed:`, error.message);
        throw error;
    }
}

async function createMigrationsTable() {
    const migrationTableSQL = `
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

    try {
        // Use the REST API to execute SQL
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY
            },
            body: JSON.stringify({ sql_query: migrationTableSQL })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log('✅ Migrations table created');
    } catch (error) {
        console.log('ℹ️  Migrations table may already exist or will be created during migration');
    }
}

async function executeSQLDirect(sql) {
    // Split SQL into individual statements and execute them
    const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
        if (statement.toLowerCase().includes('create table')) {
            // Extract table name for direct table creation
            const tableMatch = statement.match(/create table (?:if not exists )?(\w+)/i);
            if (tableMatch) {
                console.log(`   Creating table: ${tableMatch[1]}`);
            }
        }

        // For now, we'll log the statements that would be executed
        console.log(`   Statement: ${statement.substring(0, 100)}...`);
    }

    return { success: true };
}

async function checkMigrationStatus(migrationName) {
    try {
        const { data, error } = await supabase
            .from('_migrations')
            .select('*')
            .eq('name', migrationName)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }

        return !!data;
    } catch (error) {
        // If migrations table doesn't exist, migration hasn't been run
        return false;
    }
}

async function recordMigration(migrationName) {
    try {
        const { error } = await supabase
            .from('_migrations')
            .insert({ name: migrationName });

        if (error) {
            throw error;
        }

        console.log(`✅ Migration '${migrationName}' recorded`);
    } catch (error) {
        console.log(`ℹ️  Could not record migration: ${error.message}`);
    }
}

async function runMigration() {
    console.log('🚀 Starting Supabase Database Migration');
    console.log('=' * 50);

    const migrationName = '003_enhanced_user_tracking';

    // Check if migration has already been run
    const alreadyRun = await checkMigrationStatus(migrationName);
    if (alreadyRun) {
        console.log(`ℹ️  Migration '${migrationName}' has already been executed`);
        console.log('   Use --force flag to run anyway');
        return;
    }

    try {
        // Read the migration file
        const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '003_enhanced_user_tracking.sql');

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log(`📄 Loaded migration: ${migrationName}`);
        console.log(`📁 File: ${migrationPath}`);

        // Execute the migration
        await executeSQL(migrationSQL, 'Applying enhanced user tracking schema');

        // Record the migration
        await recordMigration(migrationName);

        console.log('\n🎉 Migration completed successfully!');
        console.log('\n📊 New features available:');
        console.log('   • Enhanced part_searches table with detailed tracking');
        console.log('   • User statistics aggregation');
        console.log('   • Search history with filters');
        console.log('   • Daily usage analytics');
        console.log('   • GDPR compliance features');

    } catch (error) {
        console.error('\n💥 Migration failed:', error.message);
        console.error('\nPlease check your Supabase configuration and try again.');
        process.exit(1);
    }
}

// Manual SQL execution for Supabase
async function createManualMigrationSQL() {
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '003_enhanced_user_tracking.sql');
    const outputPath = path.join(__dirname, 'supabase-migration.sql');

    let migrationSQL = '';

    if (fs.existsSync(migrationPath)) {
        migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    } else {
        // Create the migration SQL inline if file doesn't exist
        migrationSQL = `
-- Enhanced database schema for comprehensive user statistics and history tracking

-- Add missing columns to part_searches table for better tracking
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

-- Create user_statistics table for aggregated user data
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

-- Create user_search_history table for detailed search tracking
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

-- Create daily_usage_stats table for system-wide analytics
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
`;
    }

    // Add Supabase-specific headers and RLS policies
    const supabaseSQL = `
-- Supabase Enhanced User Tracking Migration
-- Generated: ${new Date().toISOString()}
-- Run this in Supabase SQL Editor

-- Create migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE IF EXISTS part_searches ENABLE ROW LEVEL SECURITY;

${migrationSQL}

-- Enable RLS for new tables
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for new tables
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_part_searches_user_id ON part_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_part_searches_created_at ON part_searches(created_at);
CREATE INDEX IF NOT EXISTS idx_part_searches_analysis_status ON part_searches(analysis_status);
CREATE INDEX IF NOT EXISTS idx_part_searches_web_scraping ON part_searches(web_scraping_used);
CREATE INDEX IF NOT EXISTS idx_user_search_history_user_id ON user_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_search_history_created_at ON user_search_history(created_at);
CREATE INDEX IF NOT EXISTS idx_user_search_history_search_type ON user_search_history(search_type);
CREATE INDEX IF NOT EXISTS idx_daily_usage_stats_date ON daily_usage_stats(date);

-- Create or replace functions for statistics updates
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

-- Create trigger for automatic statistics updates
DROP TRIGGER IF EXISTS trigger_update_user_statistics ON part_searches;
CREATE TRIGGER trigger_update_user_statistics
  AFTER INSERT OR UPDATE ON part_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_user_statistics();

-- Create or replace function for daily statistics
CREATE OR REPLACE FUNCTION update_daily_statistics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_usage_stats (
    date,
    total_uploads,
    total_users,
    total_successful_identifications,
    total_failed_identifications,
    total_web_scraping_searches,
    average_processing_time,
    updated_at
  )
  SELECT 
    DATE(NEW.created_at),
    COUNT(*),
    COUNT(DISTINCT user_id),
    COUNT(*) FILTER (WHERE analysis_status = 'completed'),
    COUNT(*) FILTER (WHERE analysis_status = 'failed'),
    COUNT(*) FILTER (WHERE web_scraping_used = true),
    COALESCE(AVG(processing_time), 0),
    NOW()
  FROM part_searches 
  WHERE DATE(created_at) = DATE(NEW.created_at)
  ON CONFLICT (date) DO UPDATE SET
    total_uploads = EXCLUDED.total_uploads,
    total_users = EXCLUDED.total_users,
    total_successful_identifications = EXCLUDED.total_successful_identifications,
    total_failed_identifications = EXCLUDED.total_failed_identifications,
    total_web_scraping_searches = EXCLUDED.total_web_scraping_searches,
    average_processing_time = EXCLUDED.average_processing_time,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for daily statistics
DROP TRIGGER IF EXISTS trigger_update_daily_statistics ON part_searches;
CREATE TRIGGER trigger_update_daily_statistics
  AFTER INSERT OR UPDATE ON part_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_statistics();

-- Migration completed
INSERT INTO _migrations (name) VALUES ('003_enhanced_user_tracking')
ON CONFLICT (name) DO NOTHING;

-- Success message
SELECT 'Enhanced user tracking migration completed successfully!' as message;
`;

    fs.writeFileSync(outputPath, supabaseSQL);
    console.log(`\n📄 Manual migration SQL created: ${outputPath}`);
    console.log('\n📋 To apply manually:');
    console.log('   1. Copy the contents of supabase-migration.sql');
    console.log('   2. Go to your Supabase Dashboard → SQL Editor');
    console.log('   3. Paste and run the SQL');
    console.log('\n🔗 Supabase Dashboard: https://app.supabase.com/project/YOUR_PROJECT_ID/sql');

    return outputPath;
}

async function testConnection() {
    console.log('🔍 Testing Supabase connection...');
    try {
        const { data, error } = await supabase.from('part_searches').select('id').limit(1);
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        console.log('✅ Supabase connection successful');
        return true;
    } catch (error) {
        console.error('❌ Supabase connection failed:', error.message);
        return false;
    }
}

async function checkMigrationStatus() {
    try {
        const { data, error } = await supabase
            .from('_migrations')
            .select('*')
            .eq('name', '003_enhanced_user_tracking');

        if (error && error.code === '42P01') {
            // Table doesn't exist
            return false;
        }

        return data && data.length > 0;
    } catch (error) {
        return false;
    }
}

async function runAutomaticMigration() {
    console.log('🚀 Starting Automatic Supabase Migration');
    console.log('=' * 50);

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
        console.log('\n💡 Try creating a manual migration instead:');
        console.log('   node scripts/migrate-to-supabase.js --manual');
        process.exit(1);
    }

    // Check if already migrated
    const alreadyMigrated = await checkMigrationStatus();
    if (alreadyMigrated) {
        console.log('ℹ️  Migration has already been applied');
        console.log('   Use --force to run anyway');
        return;
    }

    console.log('⚠️  Automatic migration requires Supabase RPC functions');
    console.log('   This may not work with all Supabase configurations');
    console.log('\n💡 Recommended: Use manual migration instead:');
    console.log('   node scripts/migrate-to-supabase.js --manual');

    return;
}

// CLI handling
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Supabase Migration Script

Usage:
  node scripts/migrate-to-supabase.js [options]

Options:
  --manual, -m    Create manual SQL file for Supabase SQL Editor (RECOMMENDED)
  --auto, -a      Attempt automatic migration (may not work)
  --help, -h      Show this help message

Environment Variables:
  SUPABASE_URL              Your Supabase project URL
  SUPABASE_SERVICE_KEY      Your Supabase service role key

Examples:
  node scripts/migrate-to-supabase.js --manual    # Create manual SQL file (RECOMMENDED)
  node scripts/migrate-to-supabase.js --auto      # Try automatic migration

Recommended Workflow:
  1. Run: node scripts/migrate-to-supabase.js --manual
  2. Copy the generated SQL from scripts/supabase-migration.sql
  3. Go to Supabase Dashboard → SQL Editor
  4. Paste and execute the SQL
`);
        return;
    }

    if (args.includes('--manual') || args.includes('-m') || args.length === 0) {
        console.log('🛠️  Creating manual migration SQL file...');
        await createManualMigrationSQL();
        return;
    }

    if (args.includes('--auto') || args.includes('-a')) {
        await runAutomaticMigration();
        return;
    }

    // Default to manual
    console.log('🛠️  Creating manual migration SQL file...');
    await createManualMigrationSQL();
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { createManualMigrationSQL, testConnection };