-- Migration for creating part_searches table

-- Create part_searches table to track user part search history
CREATE TABLE IF NOT EXISTS public.part_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Search Metadata
  search_term TEXT NOT NULL,
  search_type TEXT CHECK (search_type IN ('image', 'text', 'barcode', 'advanced')),
  
  -- Part Details
  part_name TEXT,
  part_number TEXT,
  manufacturer TEXT,
  category TEXT,
  
  -- Analysis Results
  confidence_score NUMERIC(5,2) CHECK (confidence_score BETWEEN 0 AND 100),
  is_match BOOLEAN DEFAULT FALSE,
  
  -- Image Analysis (if applicable)
  image_url TEXT,
  image_hash TEXT,
  
  -- Timestamps and Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional Metadata
  device_info JSONB,
  location_info JSONB,
  
  -- Performance Tracking
  processing_time_ms INTEGER,
  model_version TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_part_searches_user_id ON public.part_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_part_searches_created_at ON public.part_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_part_searches_part_number ON public.part_searches(part_number);
CREATE INDEX IF NOT EXISTS idx_part_searches_manufacturer ON public.part_searches(manufacturer);

-- Trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_part_searches_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_part_searches_modtime
BEFORE UPDATE ON public.part_searches
FOR EACH ROW
EXECUTE FUNCTION update_part_searches_modtime();

-- Row Level Security
ALTER TABLE public.part_searches ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view only their own search history
CREATE POLICY "Users can view own search history"
ON public.part_searches
FOR SELECT
USING (auth.uid() = user_id);

-- Policy to allow users to insert their own search history
CREATE POLICY "Users can insert own search history"
ON public.part_searches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Optional: Add comments for documentation
COMMENT ON TABLE public.part_searches IS 'Tracks user part search history and analysis results';
COMMENT ON COLUMN public.part_searches.confidence_score IS 'Confidence percentage of part match (0-100)';
COMMENT ON COLUMN public.part_searches.search_type IS 'Type of search performed (image, text, barcode, advanced)';
COMMENT ON COLUMN public.part_searches.device_info IS 'JSON object storing device metadata for the search'; 