const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testSupabaseAuth() {
    console.log('🧪 Testing Supabase Authentication System');
    console.log('=' * 50);

    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing environment variables:');
        console.error('   SUPABASE_URL:', !!supabaseUrl);
        console.error('   SUPABASE_SERVICE_KEY:', !!supabaseServiceKey);
        process.exit(1);
    }

    console.log('✅ Environment variables found');
    console.log('   SUPABASE_URL:', supabaseUrl);
    console.log('   SUPABASE_SERVICE_KEY:', supabaseServiceKey.substring(0, 20) + '...');

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // Test 1: Check if we can connect to Supabase
        console.log('\n🔍 Test 1: Testing Supabase connection...');
        const { data: tables, error: tablesError } = await supabase
            .from('profiles')
            .select('count', { count: 'exact', head: true });

        if (tablesError) {
            console.error('❌ Connection test failed:', tablesError.message);
        } else {
            console.log('✅ Supabase connection successful');
            console.log('   Profiles table count:', tables);
        }

        // Test 2: Test user registration
        console.log('\n🔍 Test 2: Testing user registration...');
        const testEmail = `test-${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    full_name: 'Test User',
                    company: 'Test Company'
                }
            }
        });

        if (authError) {
            console.error('❌ Registration test failed:', authError.message);
        } else {
            console.log('✅ User registration successful');
            console.log('   User ID:', authData.user && authData.user.id);
            console.log('   User Email:', authData.user && authData.user.email);
            console.log('   Session Token:', !!(authData.session && authData.session.access_token));
        }

        // Test 3: Test token verification
        if (authData.session && authData.session.access_token) {
            console.log('\n🔍 Test 3: Testing token verification...');

            const { data: { user }, error: verifyError } = await supabase.auth.getUser(authData.session.access_token);

            if (verifyError) {
                console.error('❌ Token verification failed:', verifyError.message);
            } else {
                console.log('✅ Token verification successful');
                console.log('   Verified User ID:', user && user.id);
                console.log('   Verified User Email:', user && user.email);
            }
        }

        console.log('\n🎉 Authentication system test completed!');

    } catch (error) {
        console.error('💥 Test failed with error:', error);
    }
}

testSupabaseAuth();