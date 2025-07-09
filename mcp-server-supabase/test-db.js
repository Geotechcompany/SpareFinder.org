import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabaseOperations() {
  console.log('��� Testing Supabase MCP Server Database Operations');
  console.log('================================================');

  try {
    // Test 1: List tables using fallback method
    console.log('\n��� Test 1: Checking database tables...');
    const knownTables = [
      'profiles',
      'part_searches',
      'subscriptions',
      'usage_tracking',
      'search_analytics',
      'user_activities',
      'notifications',
      'user_achievements',
      'part_analyses' // Added new table
    ];

    for (const tableName of knownTables) {
      try {
        const { error } = await supabase.from(tableName).select('*').limit(0);
        if (!error) {
          console.log(`   ✅ ${tableName}`);
        }
      } catch (err) {
        console.log(`   ❌ ${tableName} - ${err.message}`);
      }
    }

    // Test 2: Query part_searches table
    console.log('\n Test 2: Querying part_searches table...');
    const { data: searches, error: searchError } = await supabase
      .from('part_searches')
      .select('id, user_id, image_name, created_at')
      .limit(3);

    if (searchError) {
      console.log(`   ❌ Error: ${searchError.message}`);
    } else {
      console.log(`   ✅ Found ${searches.length} records`);
    }

    // Test 3: Query profiles table
    console.log('\n Test 3: Querying profiles table...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .limit(3);

    if (profileError) {
      console.log(`   ❌ Error: ${profileError.message}`);
    } else {
      console.log(`   ✅ Found ${profiles.length} profiles`);
    }

    // Test 4: Check part_analyses table
    console.log('\n Test 4: Checking part_analyses table...');
    try {
      const { data: analyses, error: analysesError } = await supabase
        .from('part_analyses')
        .select('id, user_id, image_id')
        .limit(1);

      if (analysesError) {
        console.log(`   ❌ Error querying part_analyses: ${analysesError.message}`);
      } else {
        console.log(`   ✅ part_analyses table accessible`);
        console.log(`   Found ${analyses.length} records`);
      }
    } catch (err) {
      console.log(`   ❌ Error accessing part_analyses: ${err.message}`);
    }

    console.log('\n Database tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDatabaseOperations();