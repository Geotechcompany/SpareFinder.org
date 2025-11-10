/**
 * Fix RLS policies for crew_analysis_jobs table
 * This allows AI service and backend to insert/update jobs
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
  console.error('\n💡 Make sure your .env file is in the backend directory');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLS() {
  console.log('🔧 Fixing RLS policies for crew_analysis_jobs table...\n');

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
  } else {
    console.log('\n✅ RLS policies fixed successfully!');
    console.log('\n📊 Verify in Supabase Dashboard:');
    console.log('   - Go to Authentication > Policies');
    console.log('   - Check crew_analysis_jobs table');
    console.log('   - Should see policies for authenticated, anon, and service_role');
  }
}

fixRLS().catch(err => {
  console.error('\n❌ Failed:', err.message);
  process.exit(1);
});

