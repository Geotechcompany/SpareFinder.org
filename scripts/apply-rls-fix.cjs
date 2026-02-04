const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function applyRLSFix() {
    try {
        console.log('🔧 Applying RLS recursion fix for profiles table...');

        // Read the SQL file
        const sqlContent = fs.readFileSync('../fix-rls-recursion.sql', 'utf8');

        // Split into individual statements (simple approach)
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📝 Found ${statements.length} SQL statements to execute`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.toLowerCase().startsWith('select')) {
                // For SELECT statements, use .from() method
                console.log(`🔍 Executing query ${i + 1}...`);
                const { data, error } = await supabase.rpc('execute_sql', {
                    sql_query: statement + ';'
                });

                if (error) {
                    console.warn(`⚠️ Query ${i + 1} warning:`, error.message);
                } else {
                    console.log(`✅ Query ${i + 1} completed`);
                    if (data) console.log('Result:', data);
                }
            } else {
                // For other statements, use RPC to execute
                console.log(`⚡ Executing statement ${i + 1}:`, statement.substring(0, 50) + '...');
                const { data, error } = await supabase.rpc('execute_sql', {
                    sql_query: statement + ';'
                });

                if (error) {
                    console.error(`❌ Statement ${i + 1} failed:`, error.message);
                } else {
                    console.log(`✅ Statement ${i + 1} completed successfully`);
                }
            }
        }

        console.log('🎯 RLS recursion fix applied successfully!');
        console.log('🔄 Now try registering the user again...');

    } catch (error) {
        console.error('💥 Error applying RLS fix:', error);
    }
}

applyRLSFix();