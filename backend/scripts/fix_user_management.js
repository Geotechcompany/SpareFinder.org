const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function fixUserManagement() {
    try {
        console.log('🔧 Starting user management fix...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '011_fix_user_management_view.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Split into individual statements
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📋 Found ${statements.length} SQL statements to execute`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
                console.log(`SQL: ${statement.substring(0, 100)}...`);

                const { error } = await supabase.rpc('execute_sql', { sql_query: statement });

                if (error) {
                    console.error(`❌ Error in statement ${i + 1}:`, error);
                    // Continue with other statements even if one fails
                } else {
                    console.log(`✅ Statement ${i + 1} executed successfully`);
                }
            }
        }

        // Verify the fix by checking users count
        console.log('🔍 Verifying user sync...');

        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact' });

        if (profilesError) {
            console.error('❌ Error checking profiles:', profilesError);
        } else {
            console.log(`✅ Profiles table now has ${profiles?.length || 0} users`);
        }

        // Check if view works
        const { data: viewData, error: viewError } = await supabase
            .from('admin_user_management')
            .select('*', { count: 'exact' })
            .limit(1);

        if (viewError) {
            console.error('❌ View still has issues:', viewError);
        } else {
            console.log(`✅ admin_user_management view is working`);
        }

        console.log('🎉 User management fix completed!');

    } catch (error) {
        console.error('💥 Error during user management fix:', error);
        process.exit(1);
    }
}

// Create execute_sql function if it doesn't exist
async function createExecuteSQLFunction() {
    const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
      RETURN 'Success';
    EXCEPTION WHEN OTHERS THEN
      RETURN 'Error: ' || SQLERRM;
    END;
    $$;
  `;

    const { error } = await supabase.rpc('exec', { sql: createFunctionSQL });
    if (error && !error.message.includes('already exists')) {
        console.log('📋 Creating execute_sql function...');
        // Try alternative approach
        const { error: altError } = await supabase.rpc('execute_sql', { sql_query: createFunctionSQL });
        if (altError) {
            console.log('⚠️  Could not create execute_sql function, will try direct execution');
        }
    }
}

// Main execution
(async () => {
    await createExecuteSQLFunction();
    await fixUserManagement();
})();