-- Create engagement_emails table for storing generated reengagement emails
-- Execute this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS engagement_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    user_name TEXT,
    email_type TEXT NOT NULL DEFAULT 'reengagement' CHECK (email_type IN ('reengagement', 'onboarding')),
    
    -- Email content (AI-generated)
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    
    -- Images used in email
    hero_image_url TEXT,
    inline_image_url TEXT,
    image_theme TEXT,
    
    -- AI generation metadata
    ai_model TEXT, -- e.g., 'gpt-4o', 'dall-e-3'
    generation_prompt TEXT,
    generation_metadata JSONB DEFAULT '{}',
    
    -- Status and tracking
    status TEXT DEFAULT 'sent' CHECK (status IN ('generated', 'sent', 'failed', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    
    -- User engagement metrics
    opened BOOLEAN DEFAULT FALSE,
    clicked BOOLEAN DEFAULT FALSE,
    clicked_url TEXT,
    
    -- Links preserved from generation
    dashboard_url TEXT,
    upload_url TEXT,
    help_url TEXT,
    contact_url TEXT,
    settings_url TEXT,
    unsubscribe_url TEXT,
    
    -- Unsubscribe tracking
    unsubscribe_token TEXT UNIQUE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_engagement_emails_user_email ON engagement_emails(user_email);
CREATE INDEX IF NOT EXISTS idx_engagement_emails_email_type ON engagement_emails(email_type);
CREATE INDEX IF NOT EXISTS idx_engagement_emails_status ON engagement_emails(status);
CREATE INDEX IF NOT EXISTS idx_engagement_emails_created_at ON engagement_emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_emails_sent_at ON engagement_emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_emails_unsubscribe_token ON engagement_emails(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_engagement_emails_unsubscribed_at ON engagement_emails(unsubscribed_at);

-- Enable RLS (Row Level Security)
ALTER TABLE engagement_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all emails
CREATE POLICY "Admins can view all engagement emails" ON engagement_emails
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Service role can do everything (for backend operations)
CREATE POLICY "Service role can manage engagement emails" ON engagement_emails
    FOR ALL
    USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE engagement_emails IS 'Stores AI-generated reengagement and onboarding emails for admin reference and analytics';

