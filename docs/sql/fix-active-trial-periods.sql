-- Fix admin-assigned trials that were stored as status=active with a 30-day period.
-- Run in Supabase SQL editor after deploying trial-day fixes.
--
-- Starter / free / basic → 7-day trial
UPDATE subscriptions
SET
  current_period_end = LEAST(
    current_period_end,
    COALESCE(current_period_start, updated_at, NOW()) + INTERVAL '7 days'
  ),
  status = 'trialing',
  updated_at = NOW()
WHERE LOWER(tier) IN ('free', 'starter', 'basic')
  AND LOWER(status) IN ('active', 'trialing')
  AND current_period_end > NOW();

-- Pro / professional / business → 3-day trial
UPDATE subscriptions
SET
  current_period_end = LEAST(
    current_period_end,
    COALESCE(current_period_start, updated_at, NOW()) + INTERVAL '3 days'
  ),
  status = 'trialing',
  updated_at = NOW()
WHERE LOWER(tier) IN ('pro', 'professional', 'business')
  AND LOWER(status) IN ('active', 'trialing')
  AND current_period_end > NOW();
