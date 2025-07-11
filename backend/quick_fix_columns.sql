-- Quick fix to add missing columns to part_searches table
-- Run this in your Supabase SQL editor

-- Add missing columns
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS search_term TEXT;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS search_type TEXT DEFAULT 'image_upload';
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS part_name TEXT;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS part_number TEXT;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS is_match BOOLEAN DEFAULT FALSE;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'completed';
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER DEFAULT 0;

-- Update existing rows with basic defaults
UPDATE part_searches SET 
    search_term = 'Image Upload',
    search_type = 'image_upload',
    is_match = FALSE,
    analysis_status = 'completed'
WHERE search_term IS NULL; 