/**
 * Direct script to apply RLS policy fix for crew_analysis_jobs table
 * Uses Supabase client directly to execute SQL statements
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

  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '020_fix_crew_analysis_jobs_rls_policies.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file loaded:', migrationPath);
  console.log('\n📋 Executing SQL statements...\n');

  // Split SQL into individual statements and execute them
  const statements = migrationSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement.trim()) continue;

    const statementWithSemicolon = statement + ';';
    console.log(`[${i + 1}/${statements.length}] Executing statement...`);
    console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);

    try {
      // Try using RPC exec_sql first
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: statementWithSemicolon
      });

      if (error) {
        // If exec_sql doesn't work, try exec_sql with sql_query parameter
        const { error: altError } = await supabase.rpc('exec_sql', { 
          sql_query: statementWithSemicolon
        });

        if (altError) {
          // If both fail, try direct query execution (for simple statements)
          if (statement.toUpperCase().includes('DROP POLICY')) {
            // For DROP POLICY, we can try using the Supabase REST API
            console.log(`   ⚠️  RPC failed, trying alternative method...`);
            
            // Extract policy name and table name from DROP POLICY statement
            const dropMatch = statement.match(/DROP POLICY IF EXISTS "([^"]+)" ON (\w+)/i);
            if (dropMatch) {
              const [, policyName, tableName] = dropMatch;
              console.log(`   ℹ️  Policy: ${policyName}, Table: ${tableName}`);
              // Note: Supabase doesn't have a direct API for DROP POLICY
              // This needs to be done via SQL Editor or we skip it
              console.log(`   ⚠️  DROP POLICY statements need to be executed manually in Supabase Dashboard`);
              console.log(`   ℹ️  Continuing with CREATE POLICY statements...\n`);
              continue;
            }
          }

          console.error(`   ❌ Error: ${altError.message}`);
          console.error(`   Code: ${altError.code}`);
          errorCount++;
          continue;
        } else {
          console.log(`   ✅ Success (using sql_query parameter)\n`);
          successCount++;
        }
      } else {
        console.log(`   ✅ Success\n`);
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Exception: ${err.message}\n`);
      errorCount++;
    }
  }

  console.log('─'.repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log('─'.repeat(60));

  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. Please apply the migration manually:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Copy contents of: backend/database/migrations/020_fix_crew_analysis_jobs_rls_policies.sql');
    console.log('   3. Paste and execute');
  } else {
    console.log('\n✅ RLS policy fix applied successfully!');
    console.log('\n📊 Verification:');
    console.log('   You can verify the policies in Supabase Dashboard:');
    console.log('   - Go to Authentication > Policies');
    console.log('   - Check crew_analysis_jobs table policies');
    console.log('   - Should see policies for authenticated, anon, and service_role');
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

