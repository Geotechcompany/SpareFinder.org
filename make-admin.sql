-- SQL to make a user admin
-- Replace 'your-email@example.com' with the actual email address

-- To make a user admin:
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- To make a user super admin:
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'your-email@example.com';

-- To check current user roles:
SELECT email, role, full_name, created_at 
FROM profiles 
ORDER BY created_at DESC; 