/**
 * Fix RLS policies for crew_analysis_jobs table
 * First creates exec_sql function if needed, then applies RLS fix
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createExecSqlFunction() {
  console.log('🔧 Creating exec_sql function...\n');
  
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
    RETURNS VOID AS $$
    BEGIN
        EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    // Try to create the function using a direct query
    // Since we can't use exec_sql before it exists, we'll use the REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: createFunctionSQL }),
    });

    if (!response.ok) {
      // Function might already exist, or we need to create it differently
      console.log('⚠️  Could not create exec_sql function via REST API');
      console.log('   This is expected if the function already exists or needs manual creation');
    } else {
      console.log('✅ exec_sql function created');
    }
  } catch (err) {
    console.log('⚠️  Could not create exec_sql function:', err.message);
    console.log('   You may need to create it manually in Supabase Dashboard');
  }
}

async function fixRLS() {
  console.log('\n🔧 Fixing RLS policies for crew_analysis_jobs table...\n');

  // Read the migration SQL
  const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '020_fix_crew_analysis_jobs_rls_policies.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split into statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.trim().startsWith('--'));

  console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim() + ';';
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
    
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      // Try exec_sql RPC function
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
        failed++;
      } else {
        console.log(`   ✅ Success`);
        success++;
      }
    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('─'.repeat(60));
  console.log(`📊 Results: ${success} successful, ${failed} failed`);
  console.log('─'.repeat(60));

  if (failed > 0) {
    console.log('\n⚠️  Some statements failed. Please apply manually:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Copy contents of: backend/database/migrations/020_fix_crew_analysis_jobs_rls_policies.sql');
    console.log('   3. Paste and execute');
    console.log('\n📄 SQL file location:');
    console.log(`   ${migrationPath}`);
  } else {
    console.log('\n✅ RLS policies fixed successfully!');
    console.log('\n📊 Verify in Supabase Dashboard:');
    console.log('   - Go to Authentication > Policies');
    console.log('   - Check crew_analysis_jobs table');
    console.log('   - Should see policies for authenticated, anon, and service_role');
  }
}

async function main() {
  await createExecSqlFunction();
  await fixRLS();
}

main().catch(err => {
  console.error('\n❌ Failed:', err.message);
  process.exit(1);
});

