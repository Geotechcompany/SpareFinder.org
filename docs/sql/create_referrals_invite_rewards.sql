-- Invitation reward system: referral_code on profiles, referrals table.
-- Run in Supabase SQL Editor (Dashboard → SQL → New query → Run).
-- After running, wait a few seconds for the API schema cache to refresh.

-- 1) referral_code on profiles (unique invite codes)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key
  ON profiles (referral_code)
  WHERE referral_code IS NOT NULL;

-- 2) Referrals: who referred whom and whether credits were awarded
CREATE TABLE IF NOT EXISTS referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    credits_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- 3) profiles.credits fallback for referral rewards (if user_credits table is unused)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;

-- Refresh PostgREST schema cache (Supabase)
NOTIFY pgrst, 'reload schema';
