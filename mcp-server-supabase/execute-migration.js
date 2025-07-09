import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function performMigration() {
  console.log(" Performing Database Migration");
  console.log("===============================");

  try {
    // Step 0: Create execute_sql function
    console.log("\n Step 0: Creating execute_sql function...");
    const createExecuteSqlFunction = `
      CREATE OR REPLACE FUNCTION execute_sql(sql TEXT)
      RETURNS VOID AS $$
      BEGIN
          EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    try {
      const { error } = await supabase.rpc('execute_sql', { sql: createExecuteSqlFunction });
      if (error) {
        console.log(`   ⚠️  Error creating execute_sql function: ${error.message}`);
      } else {
        console.log("   ✅ execute_sql function created successfully");
      }
    } catch (err) {
      console.log(`   ⚠️  Exception creating execute_sql function: ${err.message}`);
    }

    // Step 1: Add columns to part_searches table
    console.log("\\n��� Step 1: Adding columns to part_searches...");

    const alterStatements = [
      "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS similar_images JSONB DEFAULT []::jsonb",
      "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS web_scraping_used BOOLEAN DEFAULT FALSE",
      "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS sites_searched INTEGER DEFAULT 0",
      "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS parts_found INTEGER DEFAULT 0",
      "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS search_query TEXT",
      "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS image_size_bytes BIGINT",
      "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS image_format TEXT",
      "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS upload_source TEXT DEFAULT 'web'",
      "ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'completed'"
    ];

    for (const stmt of alterStatements) {
      try {
        console.log(`   Executing: ${stmt.substring(0, 50)}...`);
        // We'll use direct SQL execution approach
        const { error } = await supabase.rpc('execute_sql', { query: stmt });
        if (error) {
          console.log(`   ⚠️  ${error.message}`);
        } else {
          console.log(`   ✅ Success`);
        }
      } catch (err) {
        console.log(`   ⚠️  ${err.message}`);
      }
    }

    // Step 2: Create user_statistics table
    console.log("\\n���️  Step 2: Creating user_statistics table...");
    const createUserStats = `
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
      )
    `;

    try {
      const { error } = await supabase.rpc('execute_sql', { query: createUserStats });
      if (error) {
        console.log(`   ⚠️  ${error.message}`);
      } else {
        console.log(`   ✅ user_statistics table created`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${err.message}`);
    }

    // Step 3: Create user_search_history table  
    console.log("\\n��️  Step 3: Creating user_search_history table...");
    const createSearchHistory = `
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
      )
    `;

    try {
      const { error } = await supabase.rpc('execute_sql', { query: createSearchHistory });
      if (error) {
        console.log(`   ⚠️  ${error.message}`);
      } else {
        console.log(`   ✅ user_search_history table created`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${err.message}`);
    }

    // Step 4: Create daily_usage_stats table
    console.log("\\n���️  Step 4: Creating daily_usage_stats table...");
    const createDailyStats = `
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
      )
    `;

    try {
      const { error } = await supabase.rpc('execute_sql', { query: createDailyStats });
      if (error) {
        console.log(`   ⚠️  ${error.message}`);
      } else {
        console.log(`   ✅ daily_usage_stats table created`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${err.message}`);
    }

    console.log("\\n��� Migration execution completed!");

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  }
}

performMigration();