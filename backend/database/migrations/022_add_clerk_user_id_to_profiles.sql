-- Add Clerk user mapping to existing profiles
-- This enables linking Clerk identities to existing Supabase-auth-backed profiles by email.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

-- Ensure a Clerk user can't be linked to multiple profiles
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_clerk_user_id_unique
ON public.profiles (clerk_user_id)
WHERE clerk_user_id IS NOT NULL;


