-- Public status-page incidents. Run in the Supabase SQL Editor.
-- The API uses the service role; public clients only access the FastAPI endpoints.

CREATE TABLE IF NOT EXISTS service_incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'minor'
        CHECK (severity IN ('minor', 'major', 'critical')),
    status TEXT NOT NULL DEFAULT 'investigating'
        CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    updates JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_incidents_started_at
    ON service_incidents(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_incidents_status
    ON service_incidents(status);

ALTER TABLE service_incidents ENABLE ROW LEVEL SECURITY;
