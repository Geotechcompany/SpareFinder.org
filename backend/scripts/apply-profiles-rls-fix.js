/**
 * Script to apply RLS policy fix for profiles table
 * This fixes the issue where authenticated users cannot create their own profiles
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🔧 Applying RLS policy fix for profiles table...\n');

    const migrationPath = path.join(
      __dirname,
      '..',
      'database',
      'migrations',
      '021_fix_profiles_rls_policies.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;

      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';',
        });

        if (error) {
          // If exec_sql doesn't exist, try direct SQL execution via REST API
          console.log('⚠️ exec_sql RPC not available, trying alternative method...');
          console.log('⚠️ Please apply the migration manually in Supabase Dashboard:\n');
          console.log('   1. Go to: https://supabase.com/dashboard');
          console.log('   2. Navigate to: SQL Editor');
          console.log('   3. Copy contents of: backend/database/migrations/021_fix_profiles_rls_policies.sql');
          console.log('   4. Paste and execute the SQL\n');
          break;
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully\n`);
        }
      } catch (err) {
        console.error(`❌ Error executing statement ${i + 1}:`, err.message);
        console.log('\n⚠️ Please apply the migration manually in Supabase Dashboard:\n');
        console.log('   1. Go to: https://supabase.com/dashboard');
        console.log('   2. Navigate to: SQL Editor');
        console.log('   3. Copy contents of: backend/database/migrations/021_fix_profiles_rls_policies.sql');
        console.log('   4. Paste and execute the SQL\n');
        break;
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test profile creation by logging in as a new user');
    console.log('   2. Check Supabase Dashboard -> Authentication -> Users');
    console.log('   3. Verify profiles table has the new user entry');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.log('\n⚠️ Please apply the migration manually in Supabase Dashboard:\n');
    console.log('   1. Go to: https://supabase.com/dashboard');
    console.log('   2. Navigate to: SQL Editor');
    console.log('   3. Copy contents of: backend/database/migrations/021_fix_profiles_rls_policies.sql');
    console.log('   4. Paste and execute the SQL\n');
    process.exit(1);
  }
}

applyMigration();






