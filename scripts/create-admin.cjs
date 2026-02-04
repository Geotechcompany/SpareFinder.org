const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function createAdminUser() {
    try {
        console.log('🔧 Creating admin user...');

        const adminData = {
            email: 'tps@tpsinternational.org',
            password: 'tps@tpsinternational.org',
            full_name: 'John Ndem',
            company: 'TPS',
            role: 'super_admin'
        };

        // First, try to create the user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: adminData.email,
            password: adminData.password,
            email_confirm: true, // Skip email confirmation
            user_metadata: {
                full_name: adminData.full_name,
                company: adminData.company
            }
        });

        if (authError) {
            console.error('❌ Auth creation error:', authError);
            return;
        }

        console.log('✅ Auth user created:', authData.user.id);

        // Create profile in the profiles table
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                email: adminData.email,
                full_name: adminData.full_name,
                company: adminData.company,
                role: adminData.role
            })
            .select()
            .single();

        if (profileError) {
            console.error('❌ Profile creation error:', profileError);
            return;
        }

        console.log('✅ Profile created:', profile);

        // Generate a JWT token for immediate use
        const token = jwt.sign({
            userId: authData.user.id,
            email: authData.user.email,
            role: adminData.role
        },
            process.env.JWT_SECRET, { expiresIn: '7d' }
        );

        console.log('🎯 Admin user created successfully!');
        console.log('📧 Email:', adminData.email);
        console.log('🔑 Password:', adminData.password);
        console.log('🏷️ Role:', adminData.role);
        console.log('🎫 JWT Token:', token);
        console.log('\n🚀 You can now login with these credentials!');

    } catch (error) {
        console.error('💥 Error creating admin user:', error);
    }
}

createAdminUser();