-- Migration to update profiles table role constraint and ensure user management works properly

-- First, let's update any existing 'moderator' roles to 'admin' since we're not using moderator
UPDATE public.profiles 
SET role = 'admin' 
WHERE role = 'moderator';

-- Drop the existing role constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the new role constraint that includes super_admin
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('user', 'admin', 'super_admin', 'guest'));

-- Update the role column comment
COMMENT ON COLUMN public.profiles.role IS 'User role in the system: user, admin, super_admin, or guest';

-- Ensure we have proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(is_active);

-- Add RLS policies for admin user management
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete users" ON public.profiles;

-- Policy to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Allow if user is admin or super_admin
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile 
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.role IN ('admin', 'super_admin')
  )
  OR 
  -- Allow users to view their own profile
  auth.uid() = id
);

-- Policy to allow admins to update user roles and profiles
CREATE POLICY "Admins can update user roles" 
ON public.profiles 
FOR UPDATE 
USING (
  -- Allow if user is admin or super_admin
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile 
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.role IN ('admin', 'super_admin')
  )
  OR 
  -- Allow users to update their own profile (but not role)
  (auth.uid() = id AND role = OLD.role)
);

-- Policy to allow admins to delete users (but not themselves)
CREATE POLICY "Admins can delete users" 
ON public.profiles 
FOR DELETE 
USING (
  -- Allow if user is admin or super_admin, but not deleting themselves
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile 
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.role IN ('admin', 'super_admin')
    AND admin_profile.id != public.profiles.id -- Cannot delete themselves
  )
);

-- Create a function to sync user data from auth.users to profiles
CREATE OR REPLACE FUNCTION sync_user_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles when a new user is created in auth.users
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = EXCLUDED.updated_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync users
DROP TRIGGER IF EXISTS sync_user_to_profile_trigger ON auth.users;
CREATE TRIGGER sync_user_to_profile_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_to_profile();

-- Ensure all existing auth.users have corresponding profiles
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Create a view for admin user management that includes additional stats
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
  -- Count of uploads by user
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
  WHERE image_path IS NOT NULL
  GROUP BY user_id
) upload_stats ON p.id = upload_stats.user_id;

-- Grant permissions on the view to authenticated users with admin role
GRANT SELECT ON admin_user_management TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Admins can view user management data" ON admin_user_management
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile 
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.role IN ('admin', 'super_admin')
  )
); 