import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserEmails() {
  console.log("Ì¥ç Checking Supabase Account Emails");
  console.log("===================================");
  
  try {
    // Check profiles table for user emails
    console.log("\\nÌ≥ß Checking profiles table...");
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false });
    
    if (profilesError) {
      console.error("‚ùå Error fetching profiles:", profilesError.message);
    } else {
      console.log(`\\n‚úÖ Found ${profiles.length} user(s):`);
      profiles.forEach((profile, index) => {
        console.log(`\\n${index + 1}. User Profile:`);
        console.log(`   Ì≥ß Email: ${profile.email}`);
        console.log(`   Ì±§ Name: ${profile.full_name || "Not set"}`);
        console.log(`   Ì¥ë Role: ${profile.role}`);
        console.log(`   Ì≥Ö Created: ${new Date(profile.created_at).toLocaleString()}`);
        console.log(`   Ì∂î ID: ${profile.id}`);
      });
    }
    
    // Also check auth.users if accessible
    console.log("\\nÌ¥ê Checking auth.users table...");
    const { data: authUsers, error: authError } = await supabase
      .from("auth.users")
      .select("id, email, created_at, last_sign_in_at")
      .order("created_at", { ascending: false });
    
    if (authError) {
      console.log("‚ö†Ô∏è  Cannot access auth.users directly (expected):", authError.message);
    } else {
      console.log(`\\n‚úÖ Found ${authUsers.length} auth user(s):`);
      authUsers.forEach((user, index) => {
        console.log(`\\n${index + 1}. Auth User:`);
        console.log(`   Ì≥ß Email: ${user.email}`);
        console.log(`   Ì≥Ö Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`   Ìµê Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Never"}`);
      });
    }
    
    // Check part_searches to see user activity
    console.log("\\nÌ¥ç Checking recent part searches for user activity...");
    const { data: searches, error: searchError } = await supabase
      .from("part_searches")
      .select("user_id, created_at, image_name")
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (searchError) {
      console.error("‚ùå Error fetching searches:", searchError.message);
    } else {
      console.log(`\\n‚úÖ Recent searches (${searches.length}):`);
      searches.forEach((search, index) => {
        console.log(`   ${index + 1}. User: ${search.user_id} | Image: ${search.image_name} | Date: ${new Date(search.created_at).toLocaleString()}`);
      });
    }
    
  } catch (error) {
    console.error("‚ùå Error checking emails:", error.message);
  }
}

checkUserEmails();
