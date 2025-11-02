-- Add image_url column to jobs table
-- This allows the AI service to store Supabase Storage URLs

-- Check if image_url column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'jobs' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE jobs ADD COLUMN image_url TEXT;
        COMMENT ON COLUMN jobs.image_url IS 'Supabase Storage URL for the uploaded image';
    END IF;
END $$;
