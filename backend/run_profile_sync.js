const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runProfileSync() {
    try {
        console.log('🔄 Starting profile sync...');

        // Check current auth users
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) {
            console.error('❌ Error fetching auth users:', authError);
            return;
        }
        console.log(`📋 Found ${users.length} users in auth`);

        // Check current profiles
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, role');

        if (profilesError) {
            console.error('❌ Error fetching profiles:', profilesError);
            return;
        }
        console.log(`📋 Found ${profiles.length} existing profiles`);

        // Create profiles for missing users
        const existingProfileIds = new Set(profiles.map(p => p.id));
        const usersWithoutProfiles = users.filter(user => !existingProfileIds.has(user.id));

        console.log(`🔍 Found ${usersWithoutProfiles.length} users without profiles`);

        if (usersWithoutProfiles.length > 0) {
            const profilesToCreate = usersWithoutProfiles.map(user => ({
                id: user.id,
                email: user.email,
                full_name: (user.user_metadata && user.user_metadata.full_name) ||
                    (user.user_metadata && user.user_metadata.name) ||
                    (user.email && user.email.split('@')[0]) ||
                    'User',
                company: (user.user_metadata && user.user_metadata.company) || null,
                avatar_url: (user.user_metadata && user.user_metadata.avatar_url) ||
                    (user.user_metadata && user.user_metadata.picture) ||
                    null,
                role: user.email === 'gaudia@bqitech.com' ? 'admin' : 'user',
                created_at: user.created_at,
                updated_at: user.updated_at || user.created_at
            }));

            console.log('📝 Creating profiles:');
            profilesToCreate.forEach(profile => {
                console.log(`   - ${profile.email} (${profile.full_name}) - Role: ${profile.role}`);
            });

            const { error: insertError } = await supabase
                .from('profiles')
                .insert(profilesToCreate);

            if (insertError) {
                console.error('❌ Error creating profiles:', insertError);
            } else {
                console.log('✅ Successfully created profiles');
            }
        }

        // Update admin role if needed
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('email', 'gaudia@bqitech.com')
            .neq('role', 'admin');

        if (updateError) {
            console.error('❌ Error updating admin role:', updateError);
        } else {
            console.log('✅ Admin role updated if needed');
        }

        // Show final results
        const { data: finalProfiles, error: finalError } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, created_at')
            .order('created_at', { ascending: false });

        if (finalError) {
            console.error('❌ Error fetching final profiles:', finalError);
        } else {
            console.log(`\n📋 Final profiles (${finalProfiles.length} total):`);
            finalProfiles.forEach(profile => {
                console.log(`   - ${profile.email} (${profile.full_name}) - Role: ${profile.role}`);
            });
        }

        console.log('\n🎉 Profile sync completed!');

    } catch (error) {
        console.error('❌ Profile sync failed:', error);
    }
}

runProfileSync();