-- Create reviews table for customer feedback
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    company VARCHAR(100),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    published BOOLEAN DEFAULT true,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_published ON reviews(published);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON reviews(verified);

-- Add RLS (Row Level Security) policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy for public read access to published reviews
CREATE POLICY "Public can view published reviews" 
ON reviews FOR SELECT 
USING (published = true);

-- Policy for authenticated users to insert reviews (optional - can also allow anonymous)
CREATE POLICY "Anyone can insert reviews" 
ON reviews FOR INSERT 
WITH CHECK (true);

-- Policy for admins to manage all reviews
CREATE POLICY "Admins can manage all reviews" 
ON reviews FOR ALL 
USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'role' = 'super_admin'
);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample reviews for demonstration
INSERT INTO reviews (name, email, company, rating, title, message, verified) VALUES
('Sarah Johnson', 'sarah@autoparts.com', 'AutoParts Pro', 5, 'Outstanding AI Accuracy', 'The part recognition is incredibly accurate. Saved us hours of manual identification work and improved our workflow significantly.', true),
('Michael Chen', 'mike@techsolutions.com', 'Industrial Tech Solutions', 5, 'Game Changer for Our Business', 'Revolutionized our inventory management. The speed and accuracy are unmatched in the industry.', true),
('Emily Rodriguez', 'emily@manufacturing.com', 'Advanced Manufacturing', 4, 'Excellent Platform', 'Really impressed with the functionality. The AI recognition works great for our automotive parts database.', true),
('David Kumar', 'david@repairshop.com', 'Kumar Auto Repair', 5, 'Saves Time and Money', 'This platform has transformed how we identify parts. What used to take hours now takes minutes.', true),
('Lisa Thompson', 'lisa@logistics.com', 'Global Logistics Corp', 4, 'Impressive Technology', 'The AI capabilities are remarkable. Great tool for our parts procurement team.', true);

-- Add comment to table
COMMENT ON TABLE reviews IS 'Customer reviews and feedback for the Part Finder AI platform';
COMMENT ON COLUMN reviews.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN reviews.published IS 'Whether the review is visible on the public reviews page';
COMMENT ON COLUMN reviews.verified IS 'Whether the review has been verified by staff';