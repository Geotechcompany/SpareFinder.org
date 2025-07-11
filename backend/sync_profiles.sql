-- Sync existing auth users to profiles table
-- This will create profiles for users who exist in auth.users but not in public.profiles

-- First, let's see what users exist in auth but not in profiles
-- (This is just for information - comment out if you want to run the insert directly)

-- SELECT 
--   au.id,
--   au.email,
--   au.raw_user_meta_data->>'full_name' as full_name,
--   au.raw_user_meta_data->>'company' as company,
--   au.created_at
-- FROM auth.users au
-- LEFT JOIN public.profiles p ON au.id = p.id
-- WHERE p.id IS NULL;

-- Insert missing profiles
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  company,
  role,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1),
    'User'
  ) as full_name,
  au.raw_user_meta_data->>'company' as company,
  'user' as role, -- Default role for all users
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Admin roles should be set manually through the admin interface or SQL
-- No automatic admin role assignment

-- Show the results
SELECT 
  id,
  email,
  full_name,
  company,
  role,
  created_at
FROM public.profiles
ORDER BY created_at DESC; 