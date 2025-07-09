const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function runMigration() {
    try {
        // Initialize Supabase client
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase URL or Service Key is missing');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                persistSession: false
            }
        });

        // Comprehensive migration SQL with advanced handling
        const migrationSql = `
      -- Create profiles table if not exists
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

      -- Upsert function for profiles
      CREATE OR REPLACE FUNCTION upsert_profile(
        p_id UUID, 
        p_email TEXT, 
        p_full_name TEXT DEFAULT NULL, 
        p_username TEXT DEFAULT NULL,
        p_company TEXT DEFAULT NULL,
        p_role TEXT DEFAULT 'user'
      ) RETURNS VOID AS $$
      BEGIN
        -- Attempt to insert, update if conflict occurs
        INSERT INTO public.profiles (
          id, 
          email, 
          full_name, 
          username, 
          company, 
          role, 
          created_at, 
          updated_at
        ) VALUES (
          p_id, 
          p_email, 
          p_full_name, 
          p_username, 
          p_company, 
          p_role, 
          NOW(), 
          NOW()
        )
        ON CONFLICT (id) DO UPDATE 
        SET 
          email = EXCLUDED.email,
          full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
          username = COALESCE(EXCLUDED.username, public.profiles.username),
          company = COALESCE(EXCLUDED.company, public.profiles.company),
          role = COALESCE(EXCLUDED.role, public.profiles.role),
          updated_at = NOW();
      END;
      $$ LANGUAGE plpgsql;

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
    `;

        // Execute migration
        const { error } = await supabase.rpc('execute_sql', { sql: migrationSql });

        if (error) {
            console.error('Migration Error:', error);
            process.exit(1);
        }

        console.log('✅ Profiles table migration applied successfully');
    } catch (err) {
        console.error('Migration Failed:', err);
        process.exit(1);
    }
}

runMigration();