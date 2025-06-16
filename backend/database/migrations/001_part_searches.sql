-- Create part_searches table to store image upload and analysis results
-- Note: Images are stored in Supabase Storage bucket 'parts'
CREATE TABLE IF NOT EXISTS part_searches (
    id TEXT PRIMARY KEY, -- Using AI service request_id
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_name TEXT NOT NULL,
    predictions JSONB DEFAULT '[]'::jsonb,
    confidence_score DECIMAL(5,4) DEFAULT 0.0000, -- Allow higher precision
    processing_time INTEGER DEFAULT 0, -- in milliseconds
    ai_model_version TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_part_searches_user_id ON part_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_part_searches_created_at ON part_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_part_searches_confidence_score ON part_searches(confidence_score DESC);

-- Create RLS (Row Level Security) policies
ALTER TABLE part_searches ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own searches
CREATE POLICY "Users can view own searches" ON part_searches
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own searches
CREATE POLICY "Users can insert own searches" ON part_searches
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own searches
CREATE POLICY "Users can update own searches" ON part_searches
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own searches
CREATE POLICY "Users can delete own searches" ON part_searches
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update the updated_at column (drop if exists first)
DROP TRIGGER IF EXISTS update_part_searches_updated_at ON part_searches;
CREATE TRIGGER update_part_searches_updated_at BEFORE UPDATE
    ON part_searches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 