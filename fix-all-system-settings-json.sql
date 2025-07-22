-- Comprehensive fix for system_settings JSON formatting
-- Run this in Supabase SQL Editor to fix all string values

-- Update existing system settings to proper JSON format
UPDATE system_settings SET setting_value = '"8"' WHERE category = 'security' AND setting_key = 'password_min_length';
UPDATE system_settings SET setting_value = 'true' WHERE category = 'security' AND setting_key = 'require_special_chars';
UPDATE system_settings SET setting_value = '"3600"' WHERE category = 'security' AND setting_key = 'session_timeout';
UPDATE system_settings SET setting_value = 'false' WHERE category = 'security' AND setting_key = 'two_factor_required';

UPDATE system_settings SET setting_value = '"smtp.gmail.com"' WHERE category = 'email' AND setting_key = 'smtp_host';
UPDATE system_settings SET setting_value = '"587"' WHERE category = 'email' AND setting_key = 'smtp_port';
UPDATE system_settings SET setting_value = '"admin@geotech.com"' WHERE category = 'email' AND setting_key = 'smtp_user';
UPDATE system_settings SET setting_value = 'true' WHERE category = 'email' AND setting_key = 'smtp_secure';

UPDATE system_settings SET setting_value = 'true' WHERE category = 'notifications' AND setting_key = 'email_enabled';
UPDATE system_settings SET setting_value = 'false' WHERE category = 'notifications' AND setting_key = 'slack_enabled';
UPDATE system_settings SET setting_value = '""' WHERE category = 'notifications' AND setting_key = 'webhook_url';

UPDATE system_settings SET setting_value = 'false' WHERE category = 'system' AND setting_key = 'maintenance_mode';
UPDATE system_settings SET setting_value = 'false' WHERE category = 'system' AND setting_key = 'debug_mode';
UPDATE system_settings SET setting_value = '"info"' WHERE category = 'system' AND setting_key = 'log_level';
UPDATE system_settings SET setting_value = 'true' WHERE category = 'system' AND setting_key = 'backup_enabled';

-- Add the new smtp_from_name setting with proper JSON formatting
INSERT INTO system_settings (category, setting_key, setting_value, description, created_at, updated_at) VALUES
('email', 'smtp_from_name', '"SpareFinder AI"', 'Sender name for emails', NOW(), NOW())
ON CONFLICT (category, setting_key) DO UPDATE SET
setting_value = EXCLUDED.setting_value,
updated_at = NOW();

-- Verify all email settings
SELECT category, setting_key, setting_value, description 
FROM system_settings 
WHERE category = 'email'
ORDER BY setting_key;

SELECT 'All system settings JSON formatting fixed successfully!' as status; 