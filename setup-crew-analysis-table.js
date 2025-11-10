/**
 * Quick Setup Script for crew_analysis_jobs Table
 * Run this with: node setup-crew-analysis-table.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bharlmgxoqdafjeeknmk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
-- Create crew_analysis_jobs table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_crew_jobs_user_id ON crew_analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_jobs_status ON crew_analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_crew_jobs_created_at ON crew_analysis_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE crew_analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY IF NOT EXISTS "Users can insert their own crew jobs"
ON crew_analysis_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view their own crew jobs"
ON crew_analysis_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own crew jobs"
ON crew_analysis_jobs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own crew jobs"
ON crew_analysis_jobs FOR DELETE
USING (auth.uid() = user_id);

-- Trigger
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
`;

async function setupTable() {
  try {
    console.log('🚀 Creating crew_analysis_jobs table...');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Table created successfully!');
    console.log('✨ You can now use Deep Research feature');
    
    // Verify table exists
    const { data: tables, error: verifyError } = await supabase
      .from('crew_analysis_jobs')
      .select('*')
      .limit(0);
    
    if (verifyError) {
      console.warn('⚠️ Warning: Could not verify table:', verifyError.message);
    } else {
      console.log('✅ Table verified and ready to use!');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

setupTable();





