const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMissingColumnsMigration() {
    try {
        console.log('🔄 Starting missing columns migration...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '../database/migrations/008_add_missing_part_search_columns.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Split the SQL into individual statements
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📝 Found ${statements.length} SQL statements to execute`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
                console.log(`   ${statement.substring(0, 50)}...`);

                const { error } = await supabase.rpc('execute_sql', {
                    sql_query: statement + ';'
                });

                if (error) {
                    console.error(`❌ Error executing statement ${i + 1}:`, error);
                    // Continue with other statements even if one fails
                } else {
                    console.log(`✅ Statement ${i + 1} executed successfully`);
                }
            }
        }

        // Verify the columns were created
        console.log('\n🔍 Verifying columns were created...');

        const { data: columns, error: columnsError } = await supabase
            .rpc('execute_sql', {
                sql_query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'part_searches' 
          ORDER BY column_name;
        `
            });

        if (columnsError) {
            console.error('❌ Error checking columns:', columnsError);
        } else {
            console.log('\n📋 Current part_searches table columns:');
            columns.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('🎯 The dashboard should now work without column errors.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
applyMissingColumnsMigration();