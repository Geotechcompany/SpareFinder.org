import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findRegistrationEmail() {
  console.log("Ì¥ç Finding Supabase Account Registration Email");
  console.log("==========================================");
  
  try {
    // Find the earliest created account (likely the registration account)
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: true })
      .limit(5);
    
    if (error) {
      console.error("‚ùå Error fetching profiles:", error.message);
      return;
    }
    
    console.log("ÌøÜ First Registered Accounts:");
    profiles.forEach((profile, index) => {
      console.log(`\n${index + 1}. Account Details:`);
      console.log(`   Ì≥ß Email: ${profile.email}`);
      console.log(`   Ì±§ Name: ${profile.full_name || "Not set"}`);
      console.log(`   Ì¥ë Role: ${profile.role}`);
      console.log(`   Ì≥Ö Created: ${new Date(profile.created_at).toLocaleString()}`);
      console.log(`   Ì∂î ID: ${profile.id}`);
    });
    
  } catch (error) {
    console.error("‚ùå Error:", error.message);
  }
}

findRegistrationEmail();
