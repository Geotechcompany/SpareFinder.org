-- Allow profiles.id to be any UUID (for Clerk and other IdPs).
-- Drop FK to auth.users so we can insert profiles for users not in auth.users.
-- Run this in Supabase SQL Editor (or via MCP) if you use Clerk for auth.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Optional: add comment so future migrations know why there's no FK
COMMENT ON TABLE public.profiles IS 'User profiles. id may be from auth.users or Clerk/external IdP (no FK to auth.users).';
