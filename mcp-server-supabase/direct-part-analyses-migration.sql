-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create part_analyses table
CREATE TABLE IF NOT EXISTS part_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  image_id TEXT NOT NULL,
  part_name TEXT,
  confidence FLOAT,
  category TEXT,
  manufacturer TEXT,
  estimated_price TEXT,
  part_number TEXT,
  description TEXT,
  full_analysis JSONB,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE part_analyses ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own analyses
CREATE POLICY "Users can insert their own analyses" 
ON part_analyses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own analyses
CREATE POLICY "Users can view their own analyses" 
ON part_analyses FOR SELECT 
USING (auth.uid() = user_id);

-- Policy to allow users to delete their own analyses
CREATE POLICY "Users can delete their own analyses" 
ON part_analyses FOR DELETE 
USING (auth.uid() = user_id);

-- Optional: Create indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_part_analyses_user_id ON part_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_part_analyses_part_name ON part_analyses(part_name); 