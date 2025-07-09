const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
    try {
        // Known tables from migrations
        const knownTables = [
            'profiles',
            'part_searches',
            'user_statistics',
            'user_search_history',
            'daily_usage_stats',
            'subscriptions',
            'usage_tracking',
            'search_analytics',
            'user_activities',
            'notifications',
            'system_metrics',
            'api_keys',
            'feedback',
            'user_achievements',
            'billing_analytics',
            'performance_metrics'
        ];

        console.log('Checking database tables:');
        console.log('========================');

        for (const tableName of knownTables) {
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(0);

                if (!error) {
                    console.log(`✅ ${tableName}`);
                } else {
                    console.log(`❌ ${tableName} - ${error.message}`);
                }
            } catch (err) {
                console.log(`❌ ${tableName} - ${err.message}`);
            }
        }
    } catch (err) {
        console.error('Connection Error:', err.message);
    }
}

checkTables();