import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabaseOperations() {
    console.log('🧪 Testing Supabase MCP Server Database Operations');
    console.log('================================================');

    try {
        // Test 1: List tables
        console.log('\n📋 Test 1: Listing tables...');
        const { data: tables, error: tablesError } = await supabase.rpc('list_tables');

        if (tablesError) {
            console.log('   Using fallback method for listing tables...');
            // Fallback: Check known tables
            const knownTables = ['profiles', 'part_searches', 'subscriptions', 'usage_tracking', 'search_analytics', 'user_activities', 'notifications', 'user_achievements'];

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
        } else {
            console.log('   ✅ Tables listed successfully:');
            tables.forEach(table => console.log(`   - ${table.table_name}`));
        }

        // Test 2: Query part_searches table
        console.log('\n🔍 Test 2: Querying part_searches table...');
        const { data: searches, error: searchError } = await supabase
            .from('part_searches')
            .select('id, user_id, image_name, created_at')
            .limit(3);

        if (searchError) {
            console.log(`   ❌ Error: ${searchError.message}`);
        } else {
            console.log(`   ✅ Found ${searches.length} records`);
            if (searches.length > 0) {
                console.log('   Sample data:');
                searches.forEach((search, index) => {
                    console.log(`   ${index + 1}. ID: ${search.id}, Image: ${search.image_name || 'N/A'}`);
                });
            }
        }

        // Test 3: Query profiles table
        console.log('\n👤 Test 3: Querying profiles table...');
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, role, created_at')
            .limit(3);

        if (profileError) {
            console.log(`   ❌ Error: ${profileError.message}`);
        } else {
            console.log(`   ✅ Found ${profiles.length} profiles`);
            if (profiles.length > 0) {
                console.log('   Sample profiles:');
                profiles.forEach((profile, index) => {
                    console.log(`   ${index + 1}. Email: ${profile.email}, Role: ${profile.role}`);
                });
            }
        }

        // Test 4: Test insert operation (safe test data)
        console.log('\n📝 Test 4: Testing insert operation...');
        const testData = {
            user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
            image_url: 'https://example.com/test.jpg',
            image_name: 'mcp-test-image.jpg',
            predictions: [],
            confidence_score: 0.95,
            processing_time: 1500,
            metadata: { test: true, source: 'mcp-server' }
        };

        const { data: insertResult, error: insertError } = await supabase
            .from('part_searches')
            .insert(testData)
            .select();

        if (insertError) {
            console.log(`   ⚠️  Insert test skipped: ${insertError.message}`);
        } else {
            console.log('   ✅ Test insert successful');

            // Clean up test data
            if (insertResult && insertResult.length > 0) {
                const testId = insertResult[0].id;
                const { error: deleteError } = await supabase
                    .from('part_searches')
                    .delete()
                    .eq('id', testId);

                if (!deleteError) {
                    console.log('   🧹 Test data cleaned up');
                }
            }
        }

        console.log('\n🎉 Database tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testDatabaseOperations();