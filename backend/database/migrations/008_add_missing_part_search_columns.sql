-- Add missing columns to part_searches table for dashboard functionality
-- This migration adds columns that are being queried by the dashboard routes

-- Add search_term column
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS search_term TEXT;

-- Add search_type column
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS search_type TEXT 
DEFAULT 'image_upload' 
CHECK (search_type IN ('image_upload', 'text_search', 'barcode_scan', 'manual_entry'));

-- Add part_name column
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS part_name TEXT;

-- Add manufacturer column
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS manufacturer TEXT;

-- Add is_match column (boolean to indicate if a match was found)
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS is_match BOOLEAN 
DEFAULT FALSE;

-- Add analysis_status column (if not already exists from previous migration)
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS analysis_status TEXT 
DEFAULT 'pending' 
CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add processing_time_ms column (rename from processing_time for clarity)
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER 
DEFAULT 0;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_part_searches_search_term 
ON part_searches(search_term);

CREATE INDEX IF NOT EXISTS idx_part_searches_search_type 
ON part_searches(search_type);

CREATE INDEX IF NOT EXISTS idx_part_searches_part_name 
ON part_searches(part_name);

CREATE INDEX IF NOT EXISTS idx_part_searches_manufacturer 
ON part_searches(manufacturer);

CREATE INDEX IF NOT EXISTS idx_part_searches_is_match 
ON part_searches(is_match);

CREATE INDEX IF NOT EXISTS idx_part_searches_analysis_status 
ON part_searches(analysis_status);

-- Update existing rows with default values where appropriate
-- Use a safer approach that checks if columns exist
DO $$
BEGIN
    -- Update search_term using image_name if it exists, otherwise use a default
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'part_searches' AND column_name = 'image_name'
    ) THEN
        UPDATE part_searches 
        SET search_term = COALESCE(search_term, image_name, 'Image Upload')
        WHERE search_term IS NULL;
    ELSE
        UPDATE part_searches 
        SET search_term = COALESCE(search_term, 'Image Upload')
        WHERE search_term IS NULL;
    END IF;
    
    -- Update other columns with defaults
    UPDATE part_searches 
    SET 
        search_type = COALESCE(search_type, 'image_upload'),
        is_match = COALESCE(is_match, FALSE),
        analysis_status = COALESCE(analysis_status, 'completed')
    WHERE search_type IS NULL 
       OR is_match IS NULL 
       OR analysis_status IS NULL;
END $$;

-- Add comments to document the columns
COMMENT ON COLUMN part_searches.search_term IS 'The search term or query used for the part search';
COMMENT ON COLUMN part_searches.search_type IS 'Type of search performed (image_upload, text_search, etc.)';
COMMENT ON COLUMN part_searches.part_name IS 'Name of the identified part';
COMMENT ON COLUMN part_searches.manufacturer IS 'Manufacturer of the identified part';
COMMENT ON COLUMN part_searches.is_match IS 'Whether a successful match was found';
COMMENT ON COLUMN part_searches.analysis_status IS 'Current status of the analysis process';
COMMENT ON COLUMN part_searches.processing_time_ms IS 'Time taken to process the request in milliseconds'; 