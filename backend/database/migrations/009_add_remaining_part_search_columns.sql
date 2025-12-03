-- Add remaining columns needed by DatabaseLogger for part_searches table
-- Migration: 009_add_remaining_part_search_columns.sql

-- Add missing columns that the DatabaseLogger tries to insert
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS image_name TEXT;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS predictions JSONB DEFAULT '[]';

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS similar_images JSONB DEFAULT '[]';

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS web_scraping_used BOOLEAN DEFAULT FALSE;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS sites_searched INTEGER DEFAULT 0;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS parts_found INTEGER DEFAULT 0;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS search_query TEXT;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS image_size_bytes BIGINT;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS image_format TEXT;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS upload_source TEXT DEFAULT 'web';

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Track automatic retry attempts for failed analyses
ALTER TABLE part_searches
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Rename processing_time to processing_time_ms if it exists (for consistency)
-- But keep both for compatibility
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS processing_time INTEGER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_part_searches_image_name ON part_searches(image_name);
CREATE INDEX IF NOT EXISTS idx_part_searches_upload_source ON part_searches(upload_source);
CREATE INDEX IF NOT EXISTS idx_part_searches_web_scraping_used ON part_searches(web_scraping_used);
CREATE INDEX IF NOT EXISTS idx_part_searches_created_at ON part_searches(created_at DESC);

-- Add comments to document the new columns
COMMENT ON COLUMN part_searches.image_name IS 'Original filename of the uploaded image';
COMMENT ON COLUMN part_searches.predictions IS 'JSON array of AI predictions for the part';
COMMENT ON COLUMN part_searches.similar_images IS 'JSON array of similar images found';
COMMENT ON COLUMN part_searches.web_scraping_used IS 'Whether web scraping was used for this search';
COMMENT ON COLUMN part_searches.sites_searched IS 'Number of websites searched';
COMMENT ON COLUMN part_searches.parts_found IS 'Number of parts found in the search';
COMMENT ON COLUMN part_searches.search_query IS 'The search query used';
COMMENT ON COLUMN part_searches.image_size_bytes IS 'Size of the uploaded image in bytes';
COMMENT ON COLUMN part_searches.image_format IS 'Format/MIME type of the uploaded image';
COMMENT ON COLUMN part_searches.upload_source IS 'Source of the upload (web, mobile, api, etc.)';
COMMENT ON COLUMN part_searches.error_message IS 'Error message if the analysis failed';
COMMENT ON COLUMN part_searches.metadata IS 'Additional metadata stored as JSON';
COMMENT ON COLUMN part_searches.processing_time IS 'Processing time in seconds (for compatibility)'; 