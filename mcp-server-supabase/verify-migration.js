import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyMigration() {
  console.log("Ì¥ç Verifying Migration Results");
  console.log("=============================");
  
  const tablesToCheck = [
    "profiles", "part_searches", "subscriptions", "usage_tracking", 
    "search_analytics", "user_activities", "notifications", "user_achievements",
    "user_statistics", "user_search_history", "daily_usage_stats"
  ];
  
  let existingCount = 0;
  let newCount = 0;
  
  for (const tableName of tablesToCheck) {
    try {
      const { error } = await supabase.from(tableName).select("*").limit(0);
      if (!error) {
        if (["user_statistics", "user_search_history", "daily_usage_stats"].includes(tableName)) {
          console.log(`   ‚úÖ ${tableName} (NEW)`);
          newCount++;
        } else {
          console.log(`   ‚úÖ ${tableName}`);
          existingCount++;
        }
      } else {
        console.log(`   ‚ùå ${tableName} - ${error.message}`);
      }
    } catch (err) {
      console.log(`   ‚ùå ${tableName} - ${err.message}`);
    }
  }
  
  console.log(`\\nÌ≥ä Summary:`);
  console.log(`   Existing tables: ${existingCount}`);
  console.log(`   New tables: ${newCount}`);
  console.log(`   Total tables: ${existingCount + newCount}`);
  
  if (newCount === 3) {
    console.log("\\nÌæâ Migration completed successfully!");
  } else {
    console.log("\\n‚ö†Ô∏è  Some tables may not have been created. Please run the SQL in Supabase Dashboard.");
  }
}

verifyMigration();
