-- Workspace team invitations (invite teammates with admin/member roles)
-- Run in Supabase SQL editor after create_workspaces.sql

CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    token TEXT NOT NULL UNIQUE,
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id
    ON workspace_invitations(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token
    ON workspace_invitations(token);

-- One pending invite per email per workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_invitations_pending_email
    ON workspace_invitations(workspace_id, lower(trim(email)))
    WHERE accepted_at IS NULL;
