-- Gmail OAuth connections for admin inbound lead extraction.
-- Run in Supabase SQL Editor. Backend uses service_role (RLS bypass).
-- Refresh tokens stay server-side only; never expose via anon key.

CREATE TABLE IF NOT EXISTS gmail_oauth_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    connected_by_user_id TEXT,
    email TEXT NOT NULL,
    google_account_id TEXT,
    refresh_token TEXT NOT NULL,
    access_token TEXT,
    access_token_expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT,
    status TEXT NOT NULL DEFAULT 'connected'
        CHECK (status IN ('connected', 'revoked', 'error')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_extract_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- One active connection per Gmail address (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS idx_gmail_oauth_email_lower
    ON gmail_oauth_connections (lower(trim(email)));

CREATE INDEX IF NOT EXISTS idx_gmail_oauth_status
    ON gmail_oauth_connections(status);

CREATE INDEX IF NOT EXISTS idx_gmail_oauth_updated
    ON gmail_oauth_connections(updated_at DESC);

ALTER TABLE gmail_oauth_connections ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE gmail_oauth_connections IS
    'Admin-connected Gmail accounts for read-only inbound lead extraction. Refresh tokens must not be returned to the client.';

-- OAuth app credentials (Client ID / Secret / Redirect URI) live in system_settings
-- category = 'gmail' (keys: client_id, client_secret, redirect_uri), managed via
-- Admin → Site settings. Env GOOGLE_GMAIL_* remains a fallback.
