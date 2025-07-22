-- Quick fix for email settings JSON error
-- Run this in Supabase SQL Editor

-- Add smtp_from_name setting with proper JSON formatting
INSERT INTO system_settings (category, setting_key, setting_value, description, created_at, updated_at) VALUES
('email', 'smtp_from_name', '"SpareFinder AI"', 'Sender name for emails', NOW(), NOW())
ON CONFLICT (category, setting_key) DO NOTHING;

-- Verify the setting was inserted correctly
SELECT category, setting_key, setting_value, description 
FROM system_settings 
WHERE category = 'email' AND setting_key = 'smtp_from_name';

SELECT 'Email settings fix applied successfully!' as status; 