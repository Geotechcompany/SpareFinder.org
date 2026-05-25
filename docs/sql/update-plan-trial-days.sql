-- Sync plan trial_days with src/lib/plans.ts (canonical values)
-- Run in Supabase SQL editor if Admin → Plans still shows old trial lengths.

UPDATE plans SET trial_days = 7, updated_at = NOW()
WHERE tier IN ('free', 'starter', 'basic');

UPDATE plans SET trial_days = 3, updated_at = NOW()
WHERE tier IN ('pro', 'professional', 'business');

UPDATE plans SET trial_days = NULL, updated_at = NOW()
WHERE tier = 'enterprise';
