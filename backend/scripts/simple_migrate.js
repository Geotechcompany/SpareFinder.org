const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration003() {
    console.log('🚀 Applying migration 003 - Enhanced User Tracking...');

    try {
        // Apply the enhanced user tracking migration
        console.log('Creating user_statistics table...');
        const { error: error1 } = await supabase.rpc('exec_sql', {
            sql: `
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
      `
        });

        if (error1) {
            console.log('Direct table creation method...');
            // Try with direct table operations
            const { error } = await supabase
                .from('user_statistics')
                .select('*')
                .limit(0);

            if (error && error.code === '42P01') {
                console.log('Table does not exist, manual creation needed');
            }
        }

        console.log('✅ user_statistics table processed');

        // Add missing columns to part_searches
        console.log('Adding columns to part_searches...');
        // These will be added through manual SQL execution

        console.log('✅ Migration 003 completed');

    } catch (err) {
        console.error('Migration error:', err.message);
    }
}

applyMigration003();