-- Migration for creating profiles table with comprehensive setup

-- Drop existing table if needed (uncomment if you want to force recreation)
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  username TEXT,
  company TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator', 'guest')),
  phone_number TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  preferences JSONB,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Ensure unique constraint on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_email ON public.profiles(email);

-- Disable Row Level Security temporarily
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_profiles_modtime
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Re-enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DO $$
BEGIN
  -- Attempt to drop policies, ignore if they don't exist
  EXECUTE 'DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Allow initial profile creation" ON public.profiles';
EXCEPTION 
  WHEN OTHERS THEN 
    -- Ignore any errors during policy dropping
    RAISE NOTICE 'Error dropping policies, continuing migration';
END $$;

-- Policy to allow service role to manage profiles
CREATE POLICY "Service role can manage profiles" 
ON public.profiles 
FOR ALL 
USING (
  (SELECT current_setting('role') = 'service_role')
);

-- Policy to allow users to view and update their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Policy to allow initial profile creation during registration
CREATE POLICY "Allow initial profile creation" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = id AND 
  email IS NOT NULL
);

-- Optional: Add comments for documentation
COMMENT ON TABLE public.profiles IS 'Stores additional user profile information';
COMMENT ON COLUMN public.profiles.role IS 'User role in the system: user, admin, moderator, or guest';
COMMENT ON COLUMN public.profiles.is_verified IS 'Indicates whether the user has completed email verification'; 