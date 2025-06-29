#!/usr/bin/env node

/**
 * Test script to verify Supabase migration was successful
 * Run with: node scripts/test-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testMigration() {
    console.log('🧪 Testing Supabase Migration');
    console.log('=' * 40);

    const tests = [{
            name: 'Migration Record',
            test: async() => {
                const { data, error } = await supabase
                    .from('_migrations')
                    .select('*')
                    .eq('name', '003_enhanced_user_tracking');

                if (error) throw error;
                return data && data.length > 0;
            }
        },
        {
            name: 'User Statistics Table',
            test: async() => {
                const { data, error } = await supabase
                    .from('user_statistics')
                    .select('*')
                    .limit(1);

                // Table exists if no error or just no data
                return !error || error.code === 'PGRST116';
            }
        },
        {
            name: 'User Search History Table',
            test: async() => {
                const { data, error } = await supabase
                    .from('user_search_history')
                    .select('*')
                    .limit(1);

                return !error || error.code === 'PGRST116';
            }
        },
        {
            name: 'Daily Usage Stats Table',
            test: async() => {
                const { data, error } = await supabase
                    .from('daily_usage_stats')
                    .select('*')
                    .limit(1);

                return !error || error.code === 'PGRST116';
            }
        },
        {
            name: 'Part Searches New Columns',
            test: async() => {
                const { data, error } = await supabase
                    .from('part_searches')
                    .select('similar_images, web_scraping_used, analysis_status')
                    .limit(1);

                return !error || error.code === 'PGRST116';
            }
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            console.log(`\n🔍 Testing: ${test.name}`);
            const result = await test.test();

            if (result) {
                console.log(`✅ ${test.name}: PASSED`);
                passed++;
            } else {
                console.log(`❌ ${test.name}: FAILED`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${test.name}: ERROR - ${error.message}`);
            failed++;
        }
    }

    console.log('\n' + '=' * 40);
    console.log('📊 Test Results:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

    if (failed === 0) {
        console.log('\n🎉 All tests passed! Migration was successful.');
        console.log('\n📋 Next steps:');
        console.log('   • Test uploading an image to verify logging works');
        console.log('   • Check the new API endpoints for statistics');
        console.log('   • Verify user statistics are being tracked');
    } else {
        console.log('\n⚠️  Some tests failed. Please check:');
        console.log('   • Migration SQL was applied correctly');
        console.log('   • Using service role key (not anon key)');
        console.log('   • All tables were created successfully');
    }
}

async function main() {
    try {
        await testMigration();
    } catch (error) {
        console.error('💥 Test failed with error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}