import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
    console.log("🚀 Running part_analyses Table Migration");
    console.log("=====================================");

    try {
        // Create UUID extension
        const { error: extensionError } = await supabase.rpc('execute_sql', {
            sql: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
        });
        if (extensionError) console.warn("⚠️ UUID Extension Warning:", extensionError);

        // Create part_analyses table
        const createTableSql = `
      CREATE TABLE IF NOT EXISTS part_analyses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id),
        image_id TEXT NOT NULL,
        part_name TEXT,
        confidence FLOAT,
        category TEXT,
        manufacturer TEXT,
        estimated_price TEXT,
        part_number TEXT,
        description TEXT,
        full_analysis JSONB,
        image_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
        const { error: tableError } = await supabase.rpc('execute_sql', { sql: createTableSql });
        if (tableError) console.warn("⚠️ Table Creation Warning:", tableError);

        // Enable Row Level Security
        const rlsSql = `
      ALTER TABLE part_analyses ENABLE ROW LEVEL SECURITY;
    `;
        const { error: rlsError } = await supabase.rpc('execute_sql', { sql: rlsSql });
        if (rlsError) console.warn("⚠️ RLS Enable Warning:", rlsError);

        // Policies
        const policySqls = [
            `CREATE POLICY "Users can insert their own analyses" 
       ON part_analyses FOR INSERT 
       WITH CHECK (auth.uid() = user_id);`,

            `CREATE POLICY "Users can view their own analyses" 
       ON part_analyses FOR SELECT 
       USING (auth.uid() = user_id);`,

            `CREATE POLICY "Users can delete their own analyses" 
       ON part_analyses FOR DELETE 
       USING (auth.uid() = user_id);`
        ];

        for (const policySql of policySqls) {
            const { error: policyError } = await supabase.rpc('execute_sql', { sql: policySql });
            if (policyError) console.warn("⚠️ Policy Creation Warning:", policyError);
        }

        // Indexes
        const indexSqls = [
            `CREATE INDEX IF NOT EXISTS idx_part_analyses_user_id ON part_analyses(user_id);`,
            `CREATE INDEX IF NOT EXISTS idx_part_analyses_part_name ON part_analyses(part_name);`
        ];

        for (const indexSql of indexSqls) {
            const { error: indexError } = await supabase.rpc('execute_sql', { sql: indexSql });
            if (indexError) console.warn("⚠️ Index Creation Warning:", indexError);
        }

        console.log("✅ Migration completed successfully!");
    } catch (error) {
        console.error("❌ Migration failed:", error);
    }
}

runMigration();