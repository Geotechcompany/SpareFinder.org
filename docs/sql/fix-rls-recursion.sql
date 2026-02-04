-- Fix recursive RLS policies for profiles table

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow initial profile creation" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable admin read access" ON profiles;
DROP POLICY IF EXISTS "Enable admin update access" ON profiles;

-- Create simple, non-recursive policies

-- 1. Allow service role to do everything (for backend operations)
CREATE POLICY "Service role can manage profiles" ON profiles
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Allow anyone to insert profiles (needed for registration)
CREATE POLICY "Allow profile creation" ON profiles
    FOR INSERT 
    TO public
    WITH CHECK (true);

-- 3. Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT 
    TO public
    USING (auth.uid() = id);

-- 4. Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE 
    TO public
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname; 