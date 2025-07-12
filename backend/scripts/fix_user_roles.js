const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function fixUserRoles() {
    try {
        console.log('🔧 Starting user roles fix...');

        // Get all auth users
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
            console.error('❌ Failed to fetch auth users:', authError);
            return;
        }

        console.log(`✅ Found ${authUsers.users.length} auth users`);

        // Sync each user to profiles with correct roles
        for (const user of authUsers.users) {
            let role = 'user';
            if (user.email === 'tps@tpsinternational.org') {
                role = 'super_admin';
            } else if (user.email === 'gaudia@geotech.com') {
                role = 'admin';
            }

            console.log(`🔄 Syncing user: ${user.email} -> ${role}`);

            const userMetadata = user.user_metadata || {};
            const fullName = userMetadata.full_name || userMetadata.name || (user.email ? user.email.split('@')[0] : 'User');
            const company = userMetadata.company || null;
            const avatarUrl = userMetadata.avatar_url || userMetadata.picture || null;

            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    full_name: fullName,
                    company: company,
                    avatar_url: avatarUrl,
                    created_at: user.created_at,
                    updated_at: user.updated_at || new Date().toISOString(),
                    is_verified: user.email_confirmed_at ? true : false,
                    role: role
                }, {
                    onConflict: 'id'
                });

            if (upsertError) {
                console.error(`❌ Error syncing user ${user.email}:`, upsertError);
            } else {
                console.log(`✅ Successfully synced ${user.email} with role ${role}`);
            }
        }

        // Verify admin users
        const { data: adminUsers, error: adminError } = await supabase
            .from('profiles')
            .select('*')
            .in('role', ['admin', 'super_admin']);

        if (adminError) {
            console.error('❌ Failed to fetch admin users:', adminError);
            return;
        }

        console.log('👑 Admin users found:');
        adminUsers.forEach(user => {
            console.log(`  - ${user.email} (${user.role})`);
        });

        console.log('🎉 User roles fix completed successfully!');

    } catch (error) {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    }
}

fixUserRoles().then(() => {
    console.log('✅ Script completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});