-- Add missing columns to part_searches table if they don't exist
-- This handles the case where the table was created without all required columns

-- Add image_name column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'part_searches' AND column_name = 'image_name') THEN
        ALTER TABLE part_searches ADD COLUMN image_name TEXT;
    END IF;
END $$;

-- Update confidence_score precision if needed
DO $$ 
BEGIN 
    -- Drop and recreate with higher precision
    ALTER TABLE part_searches ALTER COLUMN confidence_score TYPE DECIMAL(5,4);
EXCEPTION 
    WHEN others THEN 
        -- Column might not exist or already have correct type
        NULL;
END $$;

-- Ensure all required columns exist
DO $$ 
BEGIN 
    -- Add ai_model_version if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'part_searches' AND column_name = 'ai_model_version') THEN
        ALTER TABLE part_searches ADD COLUMN ai_model_version TEXT;
    END IF;
    
    -- Add processing_time if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'part_searches' AND column_name = 'processing_time') THEN
        ALTER TABLE part_searches ADD COLUMN processing_time INTEGER DEFAULT 0;
    END IF;
    
    -- Add metadata if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'part_searches' AND column_name = 'metadata') THEN
        ALTER TABLE part_searches ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$; 