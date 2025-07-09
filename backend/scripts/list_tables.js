const { createClient } = require('@supabase/supabase-js');

async function listTables() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase environment variables');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        const { data, error } = await supabase.rpc('list_tables');

        if (error) {
            console.error('Error fetching tables:', error);
            return;
        }

        console.log('Database Tables:');
        data.forEach(table => console.log(`- ${table}`));
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

listTables();