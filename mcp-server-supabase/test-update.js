import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabaseUpdate() {
  console.log("Ì∑™ Testing Database Update Operations");
  console.log("===================================");
  
  try {
    // Test 1: Check existing data
    console.log("\\nÌ≥ä Step 1: Checking existing part_searches data...");
    const { data: existing, error: selectError } = await supabase
      .from("part_searches")
      .select("id, image_name, confidence_score, metadata")
      .limit(3);
      
    if (selectError) {
      console.log("‚ùå Error reading data:", selectError.message);
      return;
    }
    
    console.log(`‚úÖ Found ${existing.length} existing records`);
    if (existing.length > 0) {
      existing.forEach((record, i) => {
        console.log(`   ${i+1}. ID: ${record.id.substring(0,8)}..., Image: ${record.image_name || "N/A"}`);
      });
    }
    
    // Test 2: Insert new test record
    console.log("\\nÔøΩÔøΩ Step 2: Inserting test record...");
    const testRecord = {
      user_id: "00000000-0000-0000-0000-000000000000",
      image_url: "https://example.com/mcp-test.jpg",
      image_name: "mcp-test-" + Date.now() + ".jpg",
      predictions: [{part: "test-part", confidence: 0.95}],
      confidence_score: 0.95,
      processing_time: 1200,
      metadata: {source: "mcp-test", timestamp: new Date().toISOString()}
    };
    
    const { data: inserted, error: insertError } = await supabase
      .from("part_searches")
      .insert(testRecord)
      .select();
      
    if (insertError) {
      console.log("‚ùå Insert failed:", insertError.message);
      return;
    }
    
    console.log("‚úÖ Test record inserted successfully!");
    const testId = inserted[0].id;
    console.log(`   Record ID: ${testId}`);
    
    // Test 3: Update the test record
    console.log("\\nÌ¥Ñ Step 3: Updating test record...");
    const updateData = {
      confidence_score: 0.98,
      processing_time: 1500,
      metadata: {source: "mcp-test-updated", updated_at: new Date().toISOString()}
    };
    
    const { data: updated, error: updateError } = await supabase
      .from("part_searches")
      .update(updateData)
      .eq("id", testId)
      .select();
      
    if (updateError) {
      console.log("‚ùå Update failed:", updateError.message);
    } else {
      console.log("‚úÖ Record updated successfully!");
      console.log(`   New confidence: ${updated[0].confidence_score}`);
      console.log(`   New processing time: ${updated[0].processing_time}ms`);
    }
    
    // Test 4: Clean up test record
    console.log("\\nÌ∑π Step 4: Cleaning up test record...");
    const { error: deleteError } = await supabase
      .from("part_searches")
      .delete()
      .eq("id", testId);
      
    if (deleteError) {
      console.log("‚ö†Ô∏è  Cleanup failed:", deleteError.message);
    } else {
      console.log("‚úÖ Test record cleaned up successfully!");
    }
    
    console.log("\\nÌæâ Database update tests completed successfully!");
    
  } catch (error) {
    console.error("‚ùå Test failed:", error.message);
  }
}

testDatabaseUpdate();
