const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function fixAdminRoles() {
    try {
        console.log('🔧 Starting admin role fix...');

        // Step 1: Get all auth users
        console.log('📋 Fetching all auth users...');
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
            console.error('❌ Failed to fetch auth users:', authError);
            return;
        }

        console.log(`✅ Found ${authUsers.users.length} auth users`);

        // Step 2: Sync each user to profiles with correct roles
        console.log('🔄 Syncing users to profiles...');

        for (const user of authUsers.users) {
            const role = user.email === 'tps@tpsinternational.org' ? 'super_admin' :
                user.email === 'gaudia@geotech.com' ? 'admin' : 'user';

            console.log(`🔄 Syncing user: ${user.email} -> ${role}`);

            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata ? .full_name || user.user_metadata ? .name || user.email ? .split('@')[0] || 'User',
                    company: user.user_metadata ? .company || null,
                    avatar_url: user.user_metadata ? .avatar_url || user.user_metadata ? .picture || null,
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

        // Step 3: Verify admin users
        console.log('🔍 Verifying admin users...');

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

        // Step 4: Test the admin view
        console.log('🧪 Testing admin user management view...');

        const { data: viewData, error: viewError } = await supabase
            .from('admin_user_management')
            .select('*')
            .limit(1);

        if (viewError) {
            console.warn('⚠️  Admin view error (this is expected):', viewError.message);
            console.log('📝 Will use fallback query method in the API');
        } else {
            console.log('✅ Admin view working correctly');
        }

        console.log('🎉 Admin role fix completed successfully!');

    } catch (error) {
        console.error('💥 Fatal error during admin role fix:', error);
        process.exit(1);
    }
}

// Run the fix
fixAdminRoles().then(() => {
    console.log('✅ Script completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});