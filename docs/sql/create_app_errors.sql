-- Platform-wide error log (admin API, user API, marketing, cron).
-- Run in Supabase SQL Editor. Backend uses service_role (RLS bypass).

CREATE TABLE IF NOT EXISTS app_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'api',
    area TEXT NOT NULL DEFAULT 'user'
        CHECK (area IN ('admin', 'user', 'system')),
    severity TEXT NOT NULL DEFAULT 'error'
        CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    message TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    http_status INTEGER,
    http_path TEXT,
    http_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_errors_created ON app_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_severity ON app_errors(severity);
CREATE INDEX IF NOT EXISTS idx_app_errors_area ON app_errors(area);
CREATE INDEX IF NOT EXISTS idx_app_errors_source ON app_errors(source);

ALTER TABLE app_errors ENABLE ROW LEVEL SECURITY;
