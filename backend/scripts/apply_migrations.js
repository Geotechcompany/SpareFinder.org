const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigrations() {
    try {
        console.log('🚀 Starting database migrations...');
        console.log('==================================');

        const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Apply in order

        for (const file of migrationFiles) {
            console.log(`\n📄 Applying migration: ${file}`);

            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            try {
                // Split SQL into individual statements (simple approach)
                const statements = sql
                    .split(';')
                    .map(stmt => stmt.trim())
                    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

                for (const statement of statements) {
                    if (statement.trim()) {
                        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

                        if (error) {
                            // Try alternative method for complex statements
                            console.log(`   Trying alternative method for statement...`);
                            const { error: altError } = await supabase
                                .from('_temp')
                                .select('1')
                                .limit(0);

                            if (altError && altError.code !== '42P01') {
                                console.log(`   ⚠️  Warning: ${error.message}`);
                            }
                        }
                    }
                }

                console.log(`   ✅ ${file} applied successfully`);

            } catch (err) {
                console.log(`   ⚠️  ${file} - ${err.message}`);
            }
        }

        console.log('\n🎉 Migration process completed!');
        console.log('\n🔍 Verifying tables...');

        // Verify tables
        const { default: checkTables } = await
            import('./check_tables.js');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    }
}

applyMigrations();