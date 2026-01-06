-- Create email_unsubscribe_preferences table for tracking user unsubscribe preferences
-- Execute this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS email_unsubscribe_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Unsubscribe preferences
    unsubscribed_from_reengagement BOOLEAN DEFAULT FALSE,
    unsubscribed_from_onboarding BOOLEAN DEFAULT FALSE,
    unsubscribed_from_all_marketing BOOLEAN DEFAULT FALSE,
    
    -- Unsubscribe metadata
    unsubscribe_token TEXT UNIQUE NOT NULL,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    unsubscribe_reason TEXT,
    unsubscribe_source TEXT, -- 'email_link', 'settings_page', 'admin'
    
    -- Resubscribe tracking
    resubscribed_at TIMESTAMP WITH TIME ZONE,
    resubscribe_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_unsubscribe_preferences_user_email ON email_unsubscribe_preferences(user_email);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_preferences_user_id ON email_unsubscribe_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_preferences_token ON email_unsubscribe_preferences(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_preferences_unsubscribed_at ON email_unsubscribe_preferences(unsubscribed_at);

-- Enable RLS (Row Level Security)
ALTER TABLE email_unsubscribe_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own unsubscribe preferences
CREATE POLICY "Users can view own unsubscribe preferences" ON email_unsubscribe_preferences
    FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Users can update their own unsubscribe preferences
CREATE POLICY "Users can update own unsubscribe preferences" ON email_unsubscribe_preferences
    FOR UPDATE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Service role can do everything (for backend operations)
CREATE POLICY "Service role can manage unsubscribe preferences" ON email_unsubscribe_preferences
    FOR ALL
    USING (auth.role() = 'service_role');

-- Policy: Anyone can insert (for unsubscribe via token)
CREATE POLICY "Anyone can insert unsubscribe preferences" ON email_unsubscribe_preferences
    FOR INSERT
    WITH CHECK (true);

-- Function to check if user is unsubscribed from reengagement emails
CREATE OR REPLACE FUNCTION is_user_unsubscribed_from_reengagement(p_user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_unsubscribed BOOLEAN;
BEGIN
    SELECT 
        COALESCE(unsubscribed_from_all_marketing, FALSE) OR 
        COALESCE(unsubscribed_from_reengagement, FALSE)
    INTO is_unsubscribed
    FROM email_unsubscribe_preferences
    WHERE user_email = p_user_email
    LIMIT 1;
    
    RETURN COALESCE(is_unsubscribed, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON TABLE email_unsubscribe_preferences IS 'Tracks user unsubscribe preferences for marketing emails (reengagement, onboarding)';

