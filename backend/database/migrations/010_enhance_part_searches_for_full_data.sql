-- Migration to enhance part_searches table for complete AI analysis data storage
-- Migration: 010_enhance_part_searches_for_full_data.sql

-- Add columns for storing complete AI analysis data
ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS full_analysis TEXT;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(3,2);

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS technical_specifications TEXT;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS pricing_information TEXT;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS compatibility_info TEXT;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS supplier_information TEXT;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS installation_notes TEXT;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS material_composition TEXT;

ALTER TABLE part_searches 
ADD COLUMN IF NOT EXISTS estimated_price_range TEXT;

-- Ensure processing_time can handle decimal values
ALTER TABLE part_searches 
ALTER COLUMN processing_time TYPE NUMERIC(10,4);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_part_searches_full_analysis ON part_searches USING gin(to_tsvector('english', full_analysis));
CREATE INDEX IF NOT EXISTS idx_part_searches_ai_confidence ON part_searches(ai_confidence);
CREATE INDEX IF NOT EXISTS idx_part_searches_estimated_price_range ON part_searches(estimated_price_range);

-- Add comments for documentation
COMMENT ON COLUMN part_searches.full_analysis IS 'Complete AI analysis including technical specifications, pricing, and compatibility';
COMMENT ON COLUMN part_searches.ai_confidence IS 'AI confidence score as decimal (0.00 to 1.00)';
COMMENT ON COLUMN part_searches.technical_specifications IS 'Technical specifications and data sheet information';
COMMENT ON COLUMN part_searches.pricing_information IS 'Pricing details and cost estimates';
COMMENT ON COLUMN part_searches.compatibility_info IS 'Vehicle compatibility information';
COMMENT ON COLUMN part_searches.supplier_information IS 'Supplier and purchasing information';
COMMENT ON COLUMN part_searches.installation_notes IS 'Installation and fitment notes';
COMMENT ON COLUMN part_searches.material_composition IS 'Material composition and construction details';
COMMENT ON COLUMN part_searches.estimated_price_range IS 'Estimated price range for the part';

-- Create a function to extract sections from analysis text
CREATE OR REPLACE FUNCTION extract_analysis_section(analysis_text TEXT, section_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    -- Extract specific sections from markdown-formatted analysis
    RETURN (
        SELECT SUBSTRING(
            analysis_text 
            FROM '(\*\*' || section_name || '.*?\*\*.*?)(?=\*\*[^*]+\*\*|$)'
        )
    );
END;
$$;

-- Create a trigger to automatically extract sections when full_analysis is updated
CREATE OR REPLACE FUNCTION update_analysis_sections()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.full_analysis IS NOT NULL AND NEW.full_analysis != OLD.full_analysis THEN
        -- Extract sections from the full analysis
        NEW.technical_specifications := extract_analysis_section(NEW.full_analysis, 'Technical Data Sheet');
        NEW.pricing_information := extract_analysis_section(NEW.full_analysis, 'Pricing & Availability');
        NEW.compatibility_info := extract_analysis_section(NEW.full_analysis, 'Compatible Vehicles');
        NEW.supplier_information := extract_analysis_section(NEW.full_analysis, 'Where to Buy');
        NEW.material_composition := extract_analysis_section(NEW.full_analysis, 'Material composition');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_analysis_sections ON part_searches;
CREATE TRIGGER trigger_update_analysis_sections
    BEFORE INSERT OR UPDATE ON part_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_analysis_sections(); 