import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log("íº€ Applying Manual Migration...");
  console.log("===============================");
  
  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync("../backend/manual_migration.sql", "utf8");
    
    // Split into individual statements
    const statements = migrationSQL
      .split(";")
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith("--"));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement.trim()) continue;
      
      console.log(`\\ní³ Executing statement ${i + 1}/${statements.length}:`);
      console.log(`   ${statement.substring(0, 60)}...`);
      
      try {
        // For DDL statements, we need to use a different approach
        if (statement.includes("ALTER TABLE") || statement.includes("CREATE TABLE") || statement.includes("CREATE INDEX")) {
          // These need to be executed via SQL editor or we can try with rpc
          console.log("   âš ï¸  DDL statement - needs manual execution in Supabase Dashboard");
          continue;
        }
        
        const { data, error } = await supabase.rpc("exec", { sql: statement });
        
        if (error) {
          console.log(`   âŒ Error: ${error.message}`);
          errorCount++;
        } else {
          console.log("   âœ… Success");
          successCount++;
        }
      } catch (err) {
        console.log(`   âŒ Exception: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log(`\\ní³Š Migration Summary:`);
    console.log(`   âœ… Successful: ${successCount}`);
    console.log(`   âŒ Errors: ${errorCount}`);
    console.log(`   âš ï¸  Manual execution required for DDL statements`);
    
    // Test if new tables were created
    console.log("\\ní´ Checking for new tables...");
    const tablesToCheck = ["user_statistics", "user_search_history", "daily_usage_stats"];
    
    for (const tableName of tablesToCheck) {
      try {
        const { error } = await supabase.from(tableName).select("*").limit(0);
        if (!error) {
          console.log(`   âœ… ${tableName} - exists`);
        } else {
          console.log(`   âŒ ${tableName} - ${error.message}`);
        }
      } catch (err) {
        console.log(`   âŒ ${tableName} - ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error("âŒ Migration failed:", error.message);
  }
}

applyMigration();
