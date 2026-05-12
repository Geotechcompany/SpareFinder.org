-- Marketing outbound: open + click tracking on marketing_sends.
-- Run in Supabase SQL Editor after marketing_engine.sql. Service role bypasses RLS.

ALTER TABLE marketing_sends
  ADD COLUMN IF NOT EXISTS tracking_token TEXT,
  ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS open_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0;

-- One token per send row (nullable for legacy / failed rows without token)
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_sends_tracking_token_unique
  ON marketing_sends (tracking_token)
  WHERE tracking_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_sends_first_opened
  ON marketing_sends (first_opened_at DESC)
  WHERE first_opened_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_sends_first_clicked
  ON marketing_sends (first_clicked_at DESC)
  WHERE first_clicked_at IS NOT NULL;
