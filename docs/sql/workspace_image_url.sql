-- Workspace profile image (logo/avatar for the workspace switcher)
ALTER TABLE workspaces
    ADD COLUMN IF NOT EXISTS image_url TEXT;
