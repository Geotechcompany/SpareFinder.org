-- Marketing outbound engine: campaigns, leads, sends, errors, cold unsubscribes, webhook stub.
-- Run in Supabase SQL Editor. Backend uses service_role (RLS bypass).

-- ---------------------------------------------------------------------------
-- Global settings (SerpAPI query templates, caps, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketing_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    is_paused BOOLEAN NOT NULL DEFAULT TRUE,
    priority INTEGER NOT NULL DEFAULT 0,
    max_per_run INTEGER NOT NULL DEFAULT 10,
    max_per_day INTEGER NOT NULL DEFAULT 50,
    min_delay_seconds INTEGER NOT NULL DEFAULT 30,
    subject_template TEXT NOT NULL DEFAULT '{{company}} — streamline spare parts lookup with SpareFinder',
    html_template TEXT NOT NULL DEFAULT '<p>Hi {{first_name}},</p><p>Quick note about {{company}} and industrial spare parts…</p>',
    text_template TEXT NOT NULL DEFAULT '',
    use_ai BOOLEAN NOT NULL DEFAULT FALSE,
    use_crew_ai BOOLEAN NOT NULL DEFAULT FALSE,
    ai_brief TEXT NOT NULL DEFAULT 'SpareFinder helps teams identify parts from photos and find suppliers faster. Tone: professional, concise. No false financial claims.',
    compliance_address TEXT NOT NULL DEFAULT '',
    compliance_disclosure TEXT NOT NULL DEFAULT 'You are receiving this email because we believe it may be relevant to your professional role.',
    compliance_reason TEXT NOT NULL DEFAULT 'Business inquiry regarding industrial spare parts and procurement.',
    unsubscribe_url_pattern TEXT NOT NULL DEFAULT '{{frontend_url}}/unsubscribe/marketing?token={{unsubscribe_token}}',
    from_display_name TEXT,
    reply_to_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_paused ON marketing_campaigns(is_paused);

-- ---------------------------------------------------------------------------
-- Leads (email nullable for SerpAPI rows pending enrichment)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketing_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    job_title TEXT,
    company_name TEXT,
    platform TEXT,
    lead_status TEXT,
    source TEXT NOT NULL DEFAULT 'csv_import',
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    sanitized_full_name TEXT,
    sanitized_job_title TEXT,
    sanitized_company_name TEXT,
    sanitized_notes TEXT,
    sanitization_status TEXT NOT NULL DEFAULT 'accepted'
        CHECK (sanitization_status IN ('accepted', 'review', 'rejected')),
    crew_trace TEXT,
    unsubscribe_token TEXT UNIQUE,
    lead_status_internal TEXT NOT NULL DEFAULT 'pending'
        CHECK (lead_status_internal IN ('pending', 'sent', 'bounced', 'opt_out', 'skipped')),
    last_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_leads_email_lower
    ON marketing_leads (lower(trim(email)))
    WHERE email IS NOT NULL AND trim(email) <> '';

CREATE INDEX IF NOT EXISTS idx_marketing_leads_campaign ON marketing_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_source ON marketing_leads(source);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_sanitization ON marketing_leads(sanitization_status);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_internal ON marketing_leads(lead_status_internal);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_created ON marketing_leads(created_at DESC);

-- ---------------------------------------------------------------------------
-- Cron runs (grouping)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketing_cron_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('send', 'digest', 'discover')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Send attempts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketing_sends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES marketing_leads(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    cron_run_id UUID REFERENCES marketing_cron_runs(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
    error_message TEXT,
    subject_snapshot TEXT,
    body_html_snapshot TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_sends_lead ON marketing_sends(lead_id);
CREATE INDEX IF NOT EXISTS idx_marketing_sends_campaign ON marketing_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_sends_created ON marketing_sends(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_sends_status ON marketing_sends(status);

-- ---------------------------------------------------------------------------
-- Pipeline / non-send errors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketing_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    message TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_errors_created ON marketing_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_errors_severity ON marketing_errors(severity);

-- ---------------------------------------------------------------------------
-- Cold outreach unsubscribes (by email)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketing_unsubscribes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT DEFAULT 'link'
);

-- ---------------------------------------------------------------------------
-- ESP webhook events (optional / future)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketing_email_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_email_events_type ON marketing_email_events(event_type);

-- ---------------------------------------------------------------------------
-- RLS: enable; service_role bypasses. No policies for anon/authenticated.
-- ---------------------------------------------------------------------------
ALTER TABLE marketing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_cron_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_email_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_marketing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marketing_campaigns_updated_at ON marketing_campaigns;
CREATE TRIGGER marketing_campaigns_updated_at
    BEFORE UPDATE ON marketing_campaigns
    FOR EACH ROW EXECUTE FUNCTION set_marketing_updated_at();

DROP TRIGGER IF EXISTS marketing_leads_updated_at ON marketing_leads;
CREATE TRIGGER marketing_leads_updated_at
    BEFORE UPDATE ON marketing_leads
    FOR EACH ROW EXECUTE FUNCTION set_marketing_updated_at();

DROP TRIGGER IF EXISTS marketing_settings_updated_at ON marketing_settings;
CREATE TRIGGER marketing_settings_updated_at
    BEFORE UPDATE ON marketing_settings
    FOR EACH ROW EXECUTE FUNCTION set_marketing_updated_at();
