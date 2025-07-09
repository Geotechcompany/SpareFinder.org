import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRealUpdate() {
  console.log("í´„ Testing Real Database Update");
  console.log("==============================");
  
  try {
    // Get an existing record to update
    console.log("\\ní´ Finding existing record to update...");
    const { data: existing, error: selectError } = await supabase
      .from("part_searches")
      .select("id, user_id, image_name, confidence_score, processing_time, metadata")
      .limit(1);
      
    if (selectError || !existing || existing.length === 0) {
      console.log("âŒ No existing records found to update");
      return;
    }
    
    const record = existing[0];
    console.log(`âœ… Found record: ${record.id.substring(0,8)}...`);
    console.log(`   Current confidence: ${record.confidence_score}`);
    console.log(`   Current processing time: ${record.processing_time}ms`);
    
    // Update the record with new metadata
    console.log("\\ní³ Updating record metadata...");
    const newMetadata = {
      ...record.metadata,
      mcp_test: true,
      last_updated: new Date().toISOString(),
      update_source: "mcp-server-test"
    };
    
    const { data: updated, error: updateError } = await supabase
      .from("part_searches")
      .update({ 
        metadata: newMetadata
      })
      .eq("id", record.id)
      .select();
      
    if (updateError) {
      console.log("âŒ Update failed:", updateError.message);
    } else {
      console.log("âœ… Record updated successfully!");
      console.log("   New metadata keys:", Object.keys(updated[0].metadata));
    }
    
    // Test profile update
    console.log("\\ní±¤ Testing profile table access...");
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, role")
      .limit(1);
      
    if (profileError) {
      console.log("âŒ Profile access failed:", profileError.message);
    } else {
      console.log(`âœ… Found ${profiles.length} profiles`);
      if (profiles.length > 0) {
        console.log(`   Sample: ${profiles[0].email} (${profiles[0].role})`);
      }
    }
    
    console.log("\\ní¾‰ Database update test completed!");
    
  } catch (error) {
    console.error("âŒ Test failed:", error.message);
  }
}

testRealUpdate();
