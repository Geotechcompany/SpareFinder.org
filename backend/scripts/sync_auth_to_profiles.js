const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAuthUsersToProfiles() {
    try {
        console.log('🔄 Starting sync of auth users to profiles table...');

        // Get all users from auth
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
            console.error('❌ Error fetching auth users:', authError);
            return;
        }

        console.log(`📋 Found ${users.length} users in auth table`);

        // Get existing profiles
        const { data: existingProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id');

        if (profilesError) {
            console.error('❌ Error fetching existing profiles:', profilesError);
            return;
        }

        const existingProfileIds = new Set(existingProfiles.map(p => p.id));
        console.log(`📋 Found ${existingProfiles.length} existing profiles`);

        // Find users without profiles
        const usersWithoutProfiles = users.filter(user => !existingProfileIds.has(user.id));
        console.log(`🔍 Found ${usersWithoutProfiles.length} users without profiles`);

        if (usersWithoutProfiles.length === 0) {
            console.log('✅ All users already have profiles!');
            return;
        }

        // Create profiles for users who don't have them
        const profilesToCreate = usersWithoutProfiles.map(user => ({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata ? .full_name ||
                user.user_metadata ? .name ||
                    user.email ? .split('@')[0] ||
            'User',
            company: user.user_metadata ? .company || null,
            avatar_url: user.user_metadata ? .avatar_url ||
                user.user_metadata ? .picture ||
            null,
            role: user.email === 'gaudia@bqitech.com' ? 'admin' : 'user', // Set your admin email
            created_at: user.created_at,
            updated_at: user.updated_at || user.created_at
        }));

        console.log('📝 Creating profiles for users:');
        profilesToCreate.forEach(profile => {
            console.log(`   - ${profile.email} (${profile.full_name}) - Role: ${profile.role}`);
        });

        // Insert profiles in batches
        const batchSize = 10;
        for (let i = 0; i < profilesToCreate.length; i += batchSize) {
            const batch = profilesToCreate.slice(i, i + batchSize);

            console.log(`⏳ Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(profilesToCreate.length / batchSize)}...`);

            const { error: insertError } = await supabase
                .from('profiles')
                .insert(batch);

            if (insertError) {
                console.error(`❌ Error inserting batch:`, insertError);
                // Continue with next batch
            } else {
                console.log(`✅ Successfully inserted ${batch.length} profiles`);
            }
        }

        // Verify the sync
        console.log('\n🔍 Verifying sync...');
        const { data: finalProfiles, error: finalError } = await supabase
            .from('profiles')
            .select('id, email, full_name, role');

        if (finalError) {
            console.error('❌ Error verifying profiles:', finalError);
        } else {
            console.log(`✅ Total profiles after sync: ${finalProfiles.length}`);
            console.log('\n📋 All profiles:');
            finalProfiles.forEach(profile => {
                console.log(`   - ${profile.email} (${profile.full_name}) - Role: ${profile.role}`);
            });
        }

        console.log('\n🎉 Sync completed successfully!');

    } catch (error) {
        console.error('❌ Sync failed:', error);
        process.exit(1);
    }
}

// Run the sync
syncAuthUsersToProfiles();