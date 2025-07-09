import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRecentUploads() {
  console.log("Ì∂ºÔ∏è Checking Recent Image Uploads");
  console.log("================================");
  
  try {
    // Fetch recent part searches with more details
    const { data: searches, error } = await supabase
      .from("part_searches")
      .select(`
        id, 
        user_id, 
        image_name, 
        image_url, 
        created_at, 
        confidence_score, 
        predictions,
        analysis_status
      `)
      .order("created_at", { ascending: false })
      .limit(15);
    
    if (error) {
      console.error("‚ùå Error fetching searches:", error.message);
      return;
    }
    
    if (!searches || searches.length === 0) {
      console.log("‚ùó No recent uploads found.");
      return;
    }
    
    console.log(`Ì¥ç Found ${searches.length} recent uploads:\n`);
    
    searches.forEach((search, index) => {
      console.log(`${index + 1}. Upload Details:`);
      console.log(`   Ì∂ºÔ∏è Image Name: ${search.image_name}`);
      console.log(`   Ì¥ó Image URL: ${search.image_url}`);
      console.log(`   Ì≥Ö Upload Date: ${new Date(search.created_at).toLocaleString()}`);
      console.log(`   Ì±§ User ID: ${search.user_id}`);
      console.log(`   Ì≥ä Confidence Score: ${search.confidence_score || "N/A"}`);
      console.log(`   Ì¥¨ Analysis Status: ${search.analysis_status || "Not specified"}`);
      
      // Check predictions if available
      if (search.predictions && search.predictions.length > 0) {
        console.log("   Ì¥Æ Predictions:");
        search.predictions.forEach((pred, predIndex) => {
          console.log(`     ${predIndex + 1}. ${JSON.stringify(pred)}`);
        });
      } else {
        console.log("   Ì¥Æ No predictions found");
      }
      
      console.log(""); // Empty line for readability
    });
    
  } catch (error) {
    console.error("‚ùå Unexpected error:", error.message);
  }
}

checkRecentUploads();
