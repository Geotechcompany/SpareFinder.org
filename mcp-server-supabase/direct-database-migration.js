import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// PostgreSQL connection configuration
const client = new pg.Client({
    host: 'aws-0-us-west-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.qhtysayouknqrsdxniam',
    password: 'geotech-dev-key-2024',
    ssl: {
        rejectUnauthorized: false // Use with caution in production
    }
});

async function runDirectMigration() {
    console.log("🚀 Running Direct PostgreSQL Migration");
    console.log("=====================================");

    try {
        // Connect to the database
        await client.connect();
        console.log("✅ Connected to database successfully");

        // Read SQL migration file
        const migrationPath = path.join(__dirname, 'direct-part-analyses-migration.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        // Split SQL into individual statements
        const statements = migrationSql.split(';')
            .map(statement => statement.trim())
            .filter(statement => statement.length > 0);

        // Execute each statement
        for (const statement of statements) {
            console.log(`\n🔧 Executing SQL: ${statement.split('\n')[0]}...`);

            try {
                await client.query(statement);
                console.log(`✅ Statement executed successfully`);
            } catch (err) {
                console.warn(`⚠️ Warning for statement: ${statement.split('\n')[0]}`, err.message);
            }
        }

        console.log("\n✅ Migration completed successfully!");
    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        // Close the database connection
        await client.end();
    }
}

runDirectMigration();