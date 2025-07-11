-- Add missing columns to part_searches table
-- Execute this in your Supabase SQL editor

ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS search_term TEXT;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS search_type TEXT DEFAULT 'image_upload';
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS part_name TEXT;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS part_number TEXT;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS is_match BOOLEAN DEFAULT FALSE;
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'completed';
ALTER TABLE part_searches ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER DEFAULT 0; 