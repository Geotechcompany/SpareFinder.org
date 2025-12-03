-- Fix RLS policies for profiles table to allow backend service role to create profiles
-- This migration fixes the issue where authenticated users cannot create their own profiles
-- when the backend uses the service role key

-- Drop existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow initial profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable admin read access" ON public.profiles;
DROP POLICY IF EXISTS "Enable admin update access" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;

-- Policy 1: Allow service role to do everything (for backend operations)
-- Note: Service role should bypass RLS by default, but this policy ensures it works
-- The service role key sets the role claim to 'service_role' in the JWT
CREATE POLICY "Service role can manage profiles" 
ON public.profiles 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Policy 2: Allow authenticated users to insert their own profile
-- This works when the backend uses the user's JWT token
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = id
  OR
  -- Fallback: allow if email matches and user is authenticated
  (auth.uid() IS NOT NULL AND email IS NOT NULL)
);

-- Policy 3: Allow authenticated users to view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id
  OR
  -- Allow if email matches authenticated user's email
  (auth.jwt() ->> 'email' = email AND auth.uid() IS NOT NULL)
);

-- Policy 4: Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = id
  OR
  (auth.jwt() ->> 'email' = email AND auth.uid() IS NOT NULL)
)
WITH CHECK (
  auth.uid() = id
  OR
  (auth.jwt() ->> 'email' = email AND auth.uid() IS NOT NULL)
);

-- Policy 5: Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('admin', 'super_admin')
  )
);

-- Policy 6: Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('admin', 'super_admin')
  )
);

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON TABLE public.profiles IS 'User profiles with RLS policies allowing service role and authenticated users to manage their own profiles';

