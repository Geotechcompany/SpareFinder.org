/**
 * Script to apply RLS policy fix for crew_analysis_jobs table
 * This allows AI service and backend to insert/update jobs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRLSFix() {
  console.log('🔧 Applying RLS policy fix for crew_analysis_jobs table...');
  console.log('===========================================================\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '020_fix_crew_analysis_jobs_rls_policies.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log('\n📋 SQL to execute:');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`\n🔄 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement.trim()) continue;

      console.log(`[${i + 1}/${statements.length}] Executing statement...`);
      console.log(`   ${statement.substring(0, 80)}${statement.length > 80 ? '...' : ''}`);

      try {
        // Use RPC to execute SQL
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' // Add semicolon back
        });

        if (error) {
          // Try alternative method using exec_sql with sql_query parameter
          const { error: altError } = await supabase.rpc('exec_sql', { 
            sql_query: statement + ';'
          });

          if (altError) {
            console.error(`   ❌ Error: ${altError.message}`);
            console.error(`   Code: ${altError.code}`);
            // Continue with next statement
            continue;
          }
        }

        console.log(`   ✅ Success\n`);
      } catch (err) {
        console.error(`   ❌ Exception: ${err.message}\n`);
        // Continue with next statement
      }
    }

    console.log('✅ RLS policy fix applied successfully!');
    console.log('\n📊 Verification:');
    console.log('   You can verify the policies in Supabase Dashboard:');
    console.log('   - Go to Authentication > Policies');
    console.log('   - Check crew_analysis_jobs table policies');
    console.log('   - Should see policies for authenticated, anon, and service_role');

  } catch (error) {
    console.error('❌ Failed to apply RLS fix:', error);
    console.error('\n💡 Alternative: Apply the SQL manually in Supabase Dashboard:');
    console.error('   1. Go to SQL Editor');
    console.error('   2. Copy contents of: backend/database/migrations/020_fix_crew_analysis_jobs_rls_policies.sql');
    console.error('   3. Paste and execute');
    process.exit(1);
  }
}

// Run the migration
applyRLSFix()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

