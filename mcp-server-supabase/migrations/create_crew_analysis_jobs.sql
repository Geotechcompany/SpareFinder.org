-- Create crew_analysis_jobs table for tracking SpareFinder AI Research progress
CREATE TABLE IF NOT EXISTS crew_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  image_url TEXT,
  image_name TEXT,
  keywords TEXT,
  status TEXT DEFAULT 'pending',
  current_stage TEXT,
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  result_data JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crew_jobs_user_id ON crew_analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_jobs_status ON crew_analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_crew_jobs_created_at ON crew_analysis_jobs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE crew_analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own crew jobs
CREATE POLICY IF NOT EXISTS "Users can insert their own crew jobs"
ON crew_analysis_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own crew jobs
CREATE POLICY IF NOT EXISTS "Users can view their own crew jobs"
ON crew_analysis_jobs FOR SELECT
USING (auth.uid() = user_id);

-- Policy to allow users to update their own crew jobs
CREATE POLICY IF NOT EXISTS "Users can update their own crew jobs"
ON crew_analysis_jobs FOR UPDATE
USING (auth.uid() = user_id);

-- Policy to allow users to delete their own crew jobs
CREATE POLICY IF NOT EXISTS "Users can delete their own crew jobs"
ON crew_analysis_jobs FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crew_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crew_jobs_timestamp
BEFORE UPDATE ON crew_analysis_jobs
FOR EACH ROW
EXECUTE FUNCTION update_crew_jobs_updated_at();






