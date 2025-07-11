-- Simple SQL to add missing columns to part_searches table
-- Run this directly in your Supabase SQL editor

-- Add search_term column
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS search_term TEXT;

-- Add search_type column
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS search_type TEXT 
DEFAULT 'image_upload';

-- Add part_name column
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS part_name TEXT;

-- Add manufacturer column
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS manufacturer TEXT;

-- Add is_match column
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS is_match BOOLEAN 
DEFAULT FALSE;

-- Add analysis_status column
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS analysis_status TEXT 
DEFAULT 'pending';

-- Add image_name column (in case it's missing)
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS image_name TEXT;

-- Update existing NULL values with defaults
UPDATE part_searches 
SET 
    search_term = 'Image Upload'
WHERE search_term IS NULL;

UPDATE part_searches 
SET 
    search_type = 'image_upload'
WHERE search_type IS NULL;

UPDATE part_searches 
SET 
    is_match = FALSE
WHERE is_match IS NULL;

UPDATE part_searches 
SET 
    analysis_status = 'completed'
WHERE analysis_status IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_part_searches_search_term ON part_searches(search_term);
CREATE INDEX IF NOT EXISTS idx_part_searches_search_type ON part_searches(search_type);
CREATE INDEX IF NOT EXISTS idx_part_searches_part_name ON part_searches(part_name);
CREATE INDEX IF NOT EXISTS idx_part_searches_manufacturer ON part_searches(manufacturer);
CREATE INDEX IF NOT EXISTS idx_part_searches_is_match ON part_searches(is_match);
CREATE INDEX IF NOT EXISTS idx_part_searches_analysis_status ON part_searches(analysis_status); 