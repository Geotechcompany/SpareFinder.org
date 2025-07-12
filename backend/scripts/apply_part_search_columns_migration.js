const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('🔧 Starting part_searches columns migration...');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    try {
        console.log('📄 Reading migration file...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '../database/migrations/009_add_remaining_part_search_columns.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('🗄️ Applying migration to database...');

        // Execute the migration
        const { error } = await supabase.rpc('execute_sql', {
            query: migrationSQL
        });

        if (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }

        console.log('✅ Migration applied successfully!');

        // Verify the migration by checking if the new columns exist
        console.log('🔍 Verifying migration...');

        const { data: columns, error: columnError } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'part_searches')
            .eq('table_schema', 'public');

        if (columnError) {
            console.error('❌ Failed to verify migration:', columnError);
        } else {
            console.log('📋 Current columns in part_searches table:');
            columns.forEach(col => console.log(`  - ${col.column_name}`));
        }

    } catch (error) {
        console.error('❌ Error during migration:', error);
        process.exit(1);
    }
}

// Run the migration
applyMigration().then(() => {
    console.log('✅ Migration completed successfully!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
});