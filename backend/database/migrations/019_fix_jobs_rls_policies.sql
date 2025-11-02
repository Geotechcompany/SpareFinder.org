-- Fix RLS policies for jobs table to allow AI service to write data

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Allow authenticated users to insert jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to update jobs" ON jobs;
DROP POLICY IF EXISTS "Allow anon users to insert jobs" ON jobs;
DROP POLICY IF EXISTS "Allow anon users to update jobs" ON jobs;

-- Allow authenticated users to insert jobs
CREATE POLICY "Allow authenticated users to insert jobs"
ON jobs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update jobs
CREATE POLICY "Allow authenticated users to update jobs"
ON jobs FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow anon users to insert jobs (for AI service using anon key)
CREATE POLICY "Allow anon users to insert jobs"
ON jobs FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon users to update jobs (for AI service using anon key)
CREATE POLICY "Allow anon users to update jobs"
ON jobs FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
