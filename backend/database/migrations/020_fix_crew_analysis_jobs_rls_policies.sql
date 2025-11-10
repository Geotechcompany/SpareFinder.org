-- Fix RLS policies for crew_analysis_jobs table to allow AI service and backend to write data

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can insert their own crew jobs" ON crew_analysis_jobs;
DROP POLICY IF EXISTS "Users can view their own crew jobs" ON crew_analysis_jobs;
DROP POLICY IF EXISTS "Users can update their own crew jobs" ON crew_analysis_jobs;
DROP POLICY IF EXISTS "Users can delete their own crew jobs" ON crew_analysis_jobs;
DROP POLICY IF EXISTS "Allow authenticated users to insert crew jobs" ON crew_analysis_jobs;
DROP POLICY IF EXISTS "Allow authenticated users to update crew jobs" ON crew_analysis_jobs;
DROP POLICY IF EXISTS "Allow anon users to insert crew jobs" ON crew_analysis_jobs;
DROP POLICY IF EXISTS "Allow anon users to update crew jobs" ON crew_analysis_jobs;
DROP POLICY IF EXISTS "Allow service role to insert crew jobs" ON crew_analysis_jobs;
DROP POLICY IF EXISTS "Allow service role to update crew jobs" ON crew_analysis_jobs;

-- Allow authenticated users to insert their own crew jobs
CREATE POLICY "Allow authenticated users to insert crew jobs"
ON crew_analysis_jobs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view their own crew jobs
CREATE POLICY "Users can view their own crew jobs"
ON crew_analysis_jobs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to update their own crew jobs
CREATE POLICY "Allow authenticated users to update crew jobs"
ON crew_analysis_jobs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own crew jobs
CREATE POLICY "Users can delete their own crew jobs"
ON crew_analysis_jobs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow anon users to insert crew jobs (for AI service using anon key)
CREATE POLICY "Allow anon users to insert crew jobs"
ON crew_analysis_jobs FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon users to update crew jobs (for AI service using anon key)
CREATE POLICY "Allow anon users to update crew jobs"
ON crew_analysis_jobs FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow service role to insert crew jobs (for backend using service key)
-- Note: Service role typically bypasses RLS, but this ensures compatibility
CREATE POLICY "Allow service role to insert crew jobs"
ON crew_analysis_jobs FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow service role to update crew jobs (for backend using service key)
CREATE POLICY "Allow service role to update crew jobs"
ON crew_analysis_jobs FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

