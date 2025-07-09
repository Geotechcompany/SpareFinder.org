-- Add analysis_status column to part_searches table
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS analysis_status TEXT 
DEFAULT 'pending' 
CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed'));

-- Update existing rows with a default status
UPDATE part_searches 
SET analysis_status = 'pending' 
WHERE analysis_status IS NULL;

-- Create an index for faster querying
CREATE INDEX IF NOT EXISTS idx_part_searches_analysis_status 
ON part_searches(analysis_status); 