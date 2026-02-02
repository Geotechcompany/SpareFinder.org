#!/usr/bin/env node

/**
 * Drop profiles_id_fkey so Clerk users can have profiles (id not in auth.users).
 * Run: node run-drop-profiles-fk.js
 * Or use Supabase MCP "execute_sql" in Cursor Tools & MCP with the SQL below.
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: new URL(".env",
        import.meta.url) });

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

const SQL = "ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;";

async function run() {
    console.log("Dropping profiles_id_fkey...");
    try {
        const { data, error } = await supabase.rpc("execute_sql", { sql: SQL });
        if (error) {
            console.error("RPC execute_sql not available or failed:", error.message);
            console.log("\nRun this in Supabase Dashboard → SQL Editor:\n", SQL);
            process.exit(1);
        }
        console.log("Done.", data);
    } catch (e) {
        console.error(e.message);
        console.log("\nRun this in Supabase Dashboard → SQL Editor:\n", SQL);
        process.exit(1);
    }
}

run();