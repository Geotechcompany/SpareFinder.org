-- Run in Supabase → SQL Editor (safe to re-run).
-- Fixes: PGRST204 "Could not find the 'workspace_id' column of 'crew_analysis_jobs'"
--
-- Also run docs/sql/create_workspaces.sql first if workspaces table does not exist yet.
-- For full backfill, run docs/sql/workspace_data_isolation.sql after this script.

-- Minimal migration (tables + workspace_id columns):
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS active_workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

ALTER TABLE crew_analysis_jobs
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE part_searches
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_crew_analysis_jobs_workspace_id ON crew_analysis_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_part_searches_workspace_id ON part_searches(workspace_id);

-- Reload PostgREST schema cache (Supabase picks this up automatically; NOTIFY helps on self-hosted)
NOTIFY pgrst, 'reload schema';
