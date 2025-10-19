-- Database schema for SpareFinder AI Service
-- This replaces file-based job storage with database storage

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(255) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    class_name TEXT,
    category VARCHAR(100),
    precise_part_name TEXT,
    material_composition TEXT,
    manufacturer VARCHAR(255),
    confidence_score INTEGER,
    confidence_explanation TEXT,
    estimated_price JSONB,
    description TEXT,
    technical_data_sheet JSONB,
    compatible_vehicles TEXT[],
    engine_types TEXT[],
    buy_links JSONB,
    suppliers JSONB,
    fitment_tips TEXT,
    additional_instructions TEXT,
    full_analysis TEXT,
    processing_time_seconds DECIMAL(10,2),
    model_version VARCHAR(100),
    supplier_enrichment JSONB,
    mode VARCHAR(50), -- 'image_analysis' or 'keywords_only'
    results JSONB, -- For keyword search results
    markdown TEXT, -- For keyword search markdown
    query JSONB, -- For keyword search query
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_success ON jobs(success);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_manufacturer ON jobs(manufacturer);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for easy querying
CREATE OR REPLACE VIEW jobs_summary AS
SELECT 
    id,
    filename,
    success,
    status,
    class_name,
    category,
    precise_part_name,
    manufacturer,
    confidence_score,
    processing_time_seconds,
    created_at,
    updated_at
FROM jobs
ORDER BY created_at DESC;

-- Create a function to get job statistics
CREATE OR REPLACE FUNCTION get_job_statistics()
RETURNS TABLE (
    total_jobs BIGINT,
    successful_jobs BIGINT,
    failed_jobs BIGINT,
    pending_jobs BIGINT,
    avg_confidence DECIMAL(5,2),
    avg_processing_time DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE success = true) as successful_jobs,
        COUNT(*) FILTER (WHERE success = false) as failed_jobs,
        COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) as pending_jobs,
        ROUND(AVG(confidence_score), 2) as avg_confidence,
        ROUND(AVG(processing_time_seconds), 2) as avg_processing_time
    FROM jobs;
END;
$$ LANGUAGE plpgsql;
