-- Add trial_used to profiles so we can prevent users from taking a free trial more than once.
-- Run this in Supabase SQL editor or via your migration tool.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.trial_used IS 'Set to true when user has started or completed a free trial; prevents second trial.';
