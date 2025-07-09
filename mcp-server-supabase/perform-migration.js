import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function performMigration() {
  console.log("Ì¥ß Performing Database Migration");
  console.log("===============================");
  
  try {
    // Step 1: Check current table status
    console.log("\\nÌ≥ã Step 1: Checking current tables...");
    const currentTables = ["profiles", "part_searches", "subscriptions", "usage_tracking", 
                          "search_analytics", "user_activities", "notifications", "user_achievements"];
    const newTables = ["user_statistics", "user_search_history", "daily_usage_stats"];
    
    console.log("\\nExisting tables:");
    for (const table of currentTables) {
      try {
        const { error } = await supabase.from(table).select("*").limit(0);
        console.log(`   ${error ? "‚ùå" : "‚úÖ"} ${table}`);
      } catch (err) {
        console.log(`   ‚ùå ${table}`);
      }
    }
    
    console.log("\\nNew tables to create:");
    for (const table of newTables) {
      try {
        const { error } = await supabase.from(table).select("*").limit(0);
        console.log(`   ${error ? "‚ùå (needs creation)" : "‚úÖ (already exists)"} ${table}`);
      } catch (err) {
        console.log(`   ‚ùå ${table} (needs creation)`);
      }
    }
    
    // Step 2: Test if we can create a simple table
    console.log("\\nÌ∑™ Step 2: Testing table creation capability...");
    
    // Try creating a test table to see if DDL works
    const testTableSQL = `
      CREATE TABLE IF NOT EXISTS test_migration_table (
        id SERIAL PRIMARY KEY,
        test_data TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    console.log("   Attempting to create test table...");
    
    // Since direct DDL execution is limited, lets try an alternative approach
    // We'll check if the tables exist and provide instructions
    
    console.log("\\nÌ≥ù Step 3: Migration Instructions");
    console.log("==================================");
    console.log("Since DDL statements require manual execution in Supabase Dashboard:");
    console.log("");
    console.log("1. Open: https://supabase.com/dashboard/project/qhtysayouknqrsdxniam");
    console.log("2. Go to SQL Editor");
    console.log("3. Copy and paste the following SQL:");
    console.log("");
    console.log("-- USER STATISTICS TABLE");
    console.log("CREATE TABLE IF NOT EXISTS user_statistics (");
    console.log("    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,");
    console.log("    total_uploads INTEGER DEFAULT 0,");
    console.log("    total_successful_identifications INTEGER DEFAULT 0,");
    console.log("    total_failed_identifications INTEGER DEFAULT 0,");
    console.log("    total_web_scraping_searches INTEGER DEFAULT 0,");
    console.log("    total_similar_parts_found INTEGER DEFAULT 0,");
    console.log("    average_confidence_score DECIMAL(5,4) DEFAULT 0.0000,");
    console.log("    average_processing_time INTEGER DEFAULT 0,");
    console.log("    preferred_categories JSONB DEFAULT '[]'::jsonb,");
    console.log("    most_searched_parts JSONB DEFAULT '[]'::jsonb,");
    console.log("    last_upload_at TIMESTAMP WITH TIME ZONE,");
    console.log("    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),");
    console.log("    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()");
    console.log(");");
    console.log("");
    console.log("-- USER SEARCH HISTORY TABLE");
    console.log("CREATE TABLE IF NOT EXISTS user_search_history (");
    console.log("    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),");
    console.log("    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,");
    console.log("    part_search_id TEXT REFERENCES part_searches(id) ON DELETE CASCADE,");
    console.log("    search_type TEXT NOT NULL,");
    console.log("    search_query TEXT,");
    console.log("    results_count INTEGER DEFAULT 0,");
    console.log("    clicked_results JSONB DEFAULT '[]'::jsonb,");
    console.log("    session_id TEXT,");
    console.log("    ip_address INET,");
    console.log("    user_agent TEXT,");
    console.log("    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()");
    console.log(");");
    console.log("");
    console.log("-- DAILY USAGE STATS TABLE");
    console.log("CREATE TABLE IF NOT EXISTS daily_usage_stats (");
    console.log("    date DATE PRIMARY KEY,");
    console.log("    total_uploads INTEGER DEFAULT 0,");
    console.log("    total_users INTEGER DEFAULT 0,");
    console.log("    total_successful_identifications INTEGER DEFAULT 0,");
    console.log("    total_web_scraping_searches INTEGER DEFAULT 0,");
    console.log("    average_confidence_score DECIMAL(5,4) DEFAULT 0.0000,");
    console.log("    average_processing_time INTEGER DEFAULT 0,");
    console.log("    top_categories JSONB DEFAULT '[]'::jsonb,");
    console.log("    top_parts JSONB DEFAULT '[]'::jsonb,");
    console.log("    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),");
    console.log("    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()");
    console.log(");");
    console.log("");
    console.log("4. Click RUN to execute");
    console.log("5. Then run: node verify-migration.js to verify");
    
  } catch (error) {
    console.error("‚ùå Migration check failed:", error.message);
  }
}

performMigration();
