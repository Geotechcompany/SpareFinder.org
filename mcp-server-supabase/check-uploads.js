const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRecentUploads() {
  console.log('Ì∂ºÔ∏è Checking Recent Image Uploads');
  console.log('================================');
  
  try {
    const { data: searches, error } = await supabase
      .from('part_searches')
      .select('id, user_id, image_name, image_url, created_at, confidence_score, predictions')
      .order('created_at', { ascending: false })
      .limit(15);
    
    if (error) {
      console.error('‚ùå Error fetching searches:', error.message);
      return;
    }
    
      console.log('‚ùó No recent uploads found.');
      return;
    }
    
    console.log();
    
    searches.forEach((search, index) => {
      console.log();
      console.log();
      console.log();
      console.log();
      console.log();
      console.log();
      
      if (search.predictions && search.predictions.length > 0) {
        console.log('   Ì¥Æ Predictions:');
        search.predictions.forEach((pred, predIndex) => {
          console.log();
        });
      } else {
        console.log('   Ì¥Æ No predictions found');
      }
      
      console.log(''); // Empty line for readability
    });
    
  } catch (error) {
    console.error('‚ùå Unexpected error:', error.message);
  }
}

checkRecentUploads();
