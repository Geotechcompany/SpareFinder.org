-- Phase 2: isolate dashboard/analysis data per workspace
-- Prerequisite: docs/sql/create_workspaces.sql

CREATE OR REPLACE FUNCTION public.default_workspace_for_user(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT wm.workspace_id
  FROM workspace_members wm
  WHERE wm.user_id = p_user_id
  ORDER BY CASE wm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, wm.joined_at
  LIMIT 1;
$$;

ALTER TABLE crew_analysis_jobs
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE part_searches
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crew_analysis_jobs_workspace_id ON crew_analysis_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_part_searches_workspace_id ON part_searches(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON subscriptions(workspace_id);

-- Backfill crew_analysis_jobs
UPDATE crew_analysis_jobs j
SET workspace_id = COALESCE(p.active_workspace_id, public.default_workspace_for_user(j.user_id))
FROM profiles p
WHERE j.user_id = p.id AND j.workspace_id IS NULL AND j.user_id IS NOT NULL;

-- Backfill part_searches
UPDATE part_searches ps
SET workspace_id = COALESCE(p.active_workspace_id, public.default_workspace_for_user(ps.user_id))
FROM profiles p
WHERE ps.user_id = p.id AND ps.workspace_id IS NULL;

-- Backfill jobs (legacy comprehensive storage)
UPDATE jobs j
SET workspace_id = COALESCE(p.active_workspace_id, public.default_workspace_for_user(j.user_id))
FROM profiles p
WHERE j.user_id = p.id AND j.workspace_id IS NULL AND j.user_id IS NOT NULL;

-- Tie existing subscriptions to the user's active/default workspace
UPDATE subscriptions s
SET workspace_id = COALESCE(p.active_workspace_id, public.default_workspace_for_user(s.user_id))
FROM profiles p
WHERE s.user_id = p.id AND s.workspace_id IS NULL;
