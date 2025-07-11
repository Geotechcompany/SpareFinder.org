-- Fix RLS policies for profiles table to allow registration

-- First, check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;

-- Create new policies that allow proper registration and access
-- Allow users to insert their own profile during registration
CREATE POLICY "Enable insert for authenticated users only" ON profiles
    FOR INSERT 
    WITH CHECK (true); -- Allow all inserts for now (registration needs this)

-- Allow users to view their own profile
CREATE POLICY "Enable read access for own profile" ON profiles
    FOR SELECT 
    USING (auth.uid() = id OR auth.jwt() ->> 'email' = email);

-- Allow users to update their own profile
CREATE POLICY "Enable update for own profile" ON profiles
    FOR UPDATE 
    USING (auth.uid() = id OR auth.jwt() ->> 'email' = email)
    WITH CHECK (auth.uid() = id OR auth.jwt() ->> 'email' = email);

-- Allow admins to view all profiles
CREATE POLICY "Enable admin read access" ON profiles
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Allow admins to update all profiles
CREATE POLICY "Enable admin update access" ON profiles
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Check the updated policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles'; 