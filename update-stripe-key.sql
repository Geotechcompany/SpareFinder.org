-- Update Stripe API Key Configuration
-- Replace 'YOUR_ACTUAL_STRIPE_SECRET_KEY' with your real Stripe secret key

-- First, check current payment methods
SELECT * FROM payment_methods WHERE provider = 'stripe';

-- Update the Stripe API key (replace with your actual key)
UPDATE payment_methods 
SET 
    api_key = 'YOUR_ACTUAL_STRIPE_SECRET_KEY',  -- Replace this with your real key
    secret_key = 'YOUR_ACTUAL_STRIPE_SECRET_KEY',  -- Replace this with your real key
    test_mode = true,  -- Set to false for production
    is_active = true,
    updated_at = NOW()
WHERE provider = 'stripe';

-- If no stripe record exists, insert one
INSERT INTO payment_methods (provider, api_key, secret_key, is_active, test_mode) 
SELECT 'stripe', 'YOUR_ACTUAL_STRIPE_SECRET_KEY', 'YOUR_ACTUAL_STRIPE_SECRET_KEY', true, true
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE provider = 'stripe');

-- Verify the update
SELECT provider, LEFT(api_key, 20) || '...' as api_key_preview, is_active, test_mode, updated_at 
FROM payment_methods WHERE provider = 'stripe'; 