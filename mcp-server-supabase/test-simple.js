import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabase() {
  console.log("Testing Supabase connection...");
  
  try {
    const { data, error } = await supabase
      .from("part_searches")
      .select("id")
      .limit(1);
      
    if (error) {
      console.log("Error:", error.message);
    } else {
      console.log("✅ Database connection successful!");
      console.log("Records found:", data.length);
    }
  } catch (err) {
    console.log("Connection failed:", err.message);
  }
}

testDatabase();
