-- Migration to fix admin_user_management view and sync all users
-- Migration: 011_fix_user_management_view.sql

-- First, ensure all auth.users are synced to profiles table
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  au.created_at,
  au.updated_at,
  CASE 
    WHEN au.email = 'tps@tpsinternational.org' THEN 'super_admin'
    WHEN au.email = 'gaudia@geotech.com' THEN 'admin'
    ELSE 'user'
  END as role
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = EXCLUDED.updated_at;

-- Drop and recreate the admin_user_management view with correct column references
DROP VIEW IF EXISTS admin_user_management;

CREATE OR REPLACE VIEW admin_user_management AS
SELECT 
  p.*,
  au.email_confirmed_at,
  au.phone_confirmed_at,
  au.confirmation_sent_at,
  au.recovery_sent_at,
  au.email_change_sent_at,
  au.last_sign_in_at,
  au.raw_app_meta_data,
  au.raw_user_meta_data,
  -- Count of searches by user
  COALESCE(search_stats.search_count, 0) as search_count,
  COALESCE(search_stats.last_search_at, NULL) as last_search_at,
  -- Count of uploads by user (fixed column reference)
  COALESCE(upload_stats.upload_count, 0) as upload_count,
  COALESCE(upload_stats.last_upload_at, NULL) as last_upload_at
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as search_count,
    MAX(created_at) as last_search_at
  FROM part_searches
  GROUP BY user_id
) search_stats ON p.id = search_stats.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as upload_count,
    MAX(created_at) as last_upload_at
  FROM part_searches
  WHERE image_url IS NOT NULL  -- Fixed: was image_path, now image_url
  GROUP BY user_id
) upload_stats ON p.id = upload_stats.user_id;

-- Grant permissions on the view
GRANT SELECT ON admin_user_management TO authenticated;

-- Drop existing RLS policy and recreate
DROP POLICY IF EXISTS "Admins can view user management data" ON admin_user_management;

-- Create RLS policy for the view (this should be on the underlying tables, not the view)
-- The RLS is handled by the underlying profiles table policies

-- Update any missing profiles data from auth.users
UPDATE public.profiles 
SET 
  email = au.email,
  full_name = COALESCE(public.profiles.full_name, au.raw_user_meta_data->>'full_name', au.email),
  updated_at = NOW()
FROM auth.users au 
WHERE public.profiles.id = au.id 
AND (public.profiles.email != au.email OR public.profiles.full_name IS NULL);

-- Ensure admin users have correct roles
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'tps@tpsinternational.org' AND role != 'super_admin';

UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'gaudia@geotech.com' AND role != 'admin';

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_email_search ON public.profiles USING gin(to_tsvector('english', email));
CREATE INDEX IF NOT EXISTS idx_profiles_name_search ON public.profiles USING gin(to_tsvector('english', full_name));
CREATE INDEX IF NOT EXISTS idx_profiles_company_search ON public.profiles USING gin(to_tsvector('english', company));

-- Create a fallback function to get users with stats when view fails
CREATE OR REPLACE FUNCTION get_users_with_stats(
  search_term TEXT DEFAULT '',
  role_filter TEXT DEFAULT '',
  offset_val INTEGER DEFAULT 0,
  limit_val INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  company TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_active BOOLEAN,
  is_verified BOOLEAN,
  search_count BIGINT,
  upload_count BIGINT,
  last_sign_in_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.company,
    p.role,
    p.created_at,
    p.updated_at,
    p.is_active,
    p.is_verified,
    COALESCE(search_stats.search_count, 0)::BIGINT as search_count,
    COALESCE(upload_stats.upload_count, 0)::BIGINT as upload_count,
    au.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as search_count
    FROM part_searches
    GROUP BY user_id
  ) search_stats ON p.id = search_stats.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as upload_count
    FROM part_searches
    WHERE image_url IS NOT NULL
    GROUP BY user_id
  ) upload_stats ON p.id = upload_stats.user_id
  WHERE 
    (search_term = '' OR 
     p.email ILIKE '%' || search_term || '%' OR 
     p.full_name ILIKE '%' || search_term || '%' OR 
     p.company ILIKE '%' || search_term || '%')
    AND
    (role_filter = '' OR p.role = role_filter)
  ORDER BY p.created_at DESC
  OFFSET offset_val
  LIMIT limit_val;
END;
$$; 