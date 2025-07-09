import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import { fileURLToPath } from 'url';
import path from "path";

dotenv.config();

// ES Module equivalent of __dirname
const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runDirectMigration() {
    console.log("🚀 Running Direct SQL Migration");
    console.log("===============================");

    try {
        // Read SQL file
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
                const { data, error } = await supabase.rpc('execute_sql', { sql: statement });

                if (error) {
                    console.warn(`⚠️ Warning for statement: ${statement.split('\n')[0]}`, error);
                } else {
                    console.log(`✅ Statement executed successfully`);
                }
            } catch (err) {
                console.error(`❌ Error executing statement: ${err.message}`);
            }
        }

        console.log("\n✅ Migration completed successfully!");
    } catch (error) {
        console.error("❌ Migration failed:", error);
    }
}

runDirectMigration();