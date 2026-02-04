-- Update Stripe Secret Key in Database
-- This will fix the "Invalid API Key" error

-- First, check current configuration
SELECT * FROM payment_methods WHERE provider = 'stripe';

-- Update with the correct secret key
UPDATE payment_methods 
SET 
    api_key = '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',
    secret_key = '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',
    status = 'active',
    updated_at = NOW()
WHERE provider = 'stripe';

-- If no record exists, insert one
INSERT INTO payment_methods (provider, api_key, secret_key, status) 
SELECT 
    'stripe',
    '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',
    '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',
    'active'
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE provider = 'stripe');

-- Verify the configuration
SELECT 
    provider, 
    LEFT(api_key, 20) || '...' as api_key_preview, 
    status, 
    created_at,
    updated_at 
FROM payment_methods 
WHERE provider = 'stripe'; 