-- Migration: Create part_analysis_results table
-- Enables UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create part_analysis_results table for AI part identification
CREATE TABLE part_analysis_results (
    -- Unique identifier for the analysis result
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User who performed the analysis
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Image storage details
    image_url TEXT,
    
    -- Predictions as JSONB to allow flexible storage of prediction data
    predictions JSONB NOT NULL,
    
    -- Similar images as JSONB to store related image information
    similar_images JSONB,
    
    -- Performance and analysis metadata
    processing_time REAL NOT NULL,
    confidence_threshold REAL NOT NULL DEFAULT 0.3,
    
    -- Timestamps for tracking
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Optional search and categorization fields
    primary_part_name TEXT,
    primary_part_category TEXT,
    primary_part_confidence REAL,
    
    -- Optional metadata for additional context
    metadata JSONB
);

-- Create an index on user_id for faster queries
CREATE INDEX idx_part_analysis_user_id ON part_analysis_results(user_id);

-- Create an index on created_at for time-based queries
CREATE INDEX idx_part_analysis_created_at ON part_analysis_results(created_at);

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_part_analysis_results_modtime
BEFORE UPDATE ON part_analysis_results
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Optional: Add Row Level Security (RLS) for data protection
ALTER TABLE part_analysis_results ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own analysis results
CREATE POLICY "Users can view their own analysis results" 
ON part_analysis_results 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy to allow users to insert their own analysis results
CREATE POLICY "Users can insert their own analysis results" 
ON part_analysis_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Optional: Add a comment to describe the table
COMMENT ON TABLE part_analysis_results IS 
'Stores results of AI-powered Engineering spares part identification analyses, including predictions, image URLs, and performance metadata.'; 