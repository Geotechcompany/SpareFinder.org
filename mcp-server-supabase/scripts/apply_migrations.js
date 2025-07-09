const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyMigrations() {
    // Log environment variables for debugging
    console.log('🔍 Supabase URL:', process.env.SUPABASE_URL);
    console.log('🔍 Service Role Key Present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Validate Supabase configuration
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Missing Supabase configuration. Check your .env file.');
        process.exit(1);
    }

    // Create Supabase client
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Path to migrations directory
    const migrationsDir = path.join(__dirname, '../migrations');

    try {
        // Verify migrations directory exists
        if (!fs.existsSync(migrationsDir)) {
            console.error(`❌ Migrations directory not found: ${migrationsDir}`);
            process.exit(1);
        }

        // Read migration files
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Ensure migrations run in order

        console.log('🚀 Starting database migrations...');
        console.log('📄 Migration files found:', migrationFiles);

        for (const file of migrationFiles) {
            const migrationPath = path.join(migrationsDir, file);
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

            console.log(`📦 Applying migration: ${file}`);
            console.log('SQL Content:', migrationSQL.substring(0, 500) + '...'); // Log first 500 chars

            try {
                // Execute migration directly using raw SQL
                const { error } = await supabase.sql(migrationSQL);

                if (error) {
                    console.error(`❌ Migration ${file} failed:`, error);
                    process.exit(1);
                }

                console.log(`✅ Migration ${file} applied successfully`);
            } catch (executionError) {
                console.error(`❌ Execution error in migration ${file}:`, executionError);
                process.exit(1);
            }
        }

        console.log('🎉 All migrations completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration process failed:', err);
        process.exit(1);
    }
}

// Execute migrations
applyMigrations();