const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

if (!stripeSecretKey) {
    console.error('❌ Missing STRIPE_SECRET_KEY environment variable');
    console.log('💡 Please add STRIPE_SECRET_KEY=sk_test_... to your .env file');
    process.exit(1);
}

if (!stripeSecretKey.startsWith('sk_')) {
    console.error('❌ Invalid Stripe key format. Should start with sk_test_ or sk_live_');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateStripeConfig() {
    try {
        console.log('🔄 Updating Stripe configuration...');

        const isTestMode = stripeSecretKey.startsWith('sk_test_');

        // First check if a record exists
        const { data: existing, error: fetchError } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('provider', 'stripe')
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw fetchError;
        }

        if (existing) {
            // Update existing record
            const { error: updateError } = await supabase
                .from('payment_methods')
                .update({
                    api_key: stripeSecretKey,
                    secret_key: stripeSecretKey,
                    is_active: true,
                    test_mode: isTestMode,
                    updated_at: new Date().toISOString()
                })
                .eq('provider', 'stripe');

            if (updateError) throw updateError;

            console.log('✅ Updated existing Stripe configuration');
        } else {
            // Insert new record
            const { error: insertError } = await supabase
                .from('payment_methods')
                .insert({
                    provider: 'stripe',
                    api_key: stripeSecretKey,
                    secret_key: stripeSecretKey,
                    is_active: true,
                    test_mode: isTestMode
                });

            if (insertError) throw insertError;

            console.log('✅ Inserted new Stripe configuration');
        }

        // Verify the configuration
        const { data: verification, error: verifyError } = await supabase
            .from('payment_methods')
            .select('provider, is_active, test_mode, created_at, updated_at')
            .eq('provider', 'stripe')
            .single();

        if (verifyError) throw verifyError;

        console.log('📋 Current Stripe configuration:');
        console.log(`   Provider: ${verification.provider}`);
        console.log(`   Active: ${verification.is_active}`);
        console.log(`   Test Mode: ${verification.test_mode}`);
        console.log(`   Key Type: ${isTestMode ? 'Test Key (sk_test_...)' : 'Live Key (sk_live_...)'}`);
        console.log(`   Updated: ${verification.updated_at}`);

        console.log('\n🎉 Stripe configuration updated successfully!');
        console.log('💡 Your billing system should now work properly.');

    } catch (error) {
        console.error('❌ Error updating Stripe configuration:', error.message);
        process.exit(1);
    }
}

updateStripeConfig();