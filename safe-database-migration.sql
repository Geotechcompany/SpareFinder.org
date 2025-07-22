-- Safe Database Migration for SpareFinder
-- Execute this in your Supabase SQL Editor

-- =============================================
-- Check and create missing tables safely
-- =============================================

-- 1. Create notifications table (safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        CREATE TABLE notifications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
            read BOOLEAN DEFAULT FALSE,
            action_url TEXT,
            expires_at TIMESTAMP WITH TIME ZONE,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view own notifications" ON notifications
          FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can update own notifications" ON notifications
          FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete own notifications" ON notifications
          FOR DELETE USING (auth.uid() = user_id);
        
        -- Create indexes
        CREATE INDEX notifications_user_id_idx ON notifications(user_id);
        CREATE INDEX notifications_read_idx ON notifications(read);
        CREATE INDEX notifications_created_at_idx ON notifications(created_at);
        CREATE INDEX notifications_type_idx ON notifications(type);
        
        RAISE NOTICE 'Created notifications table';
    ELSE
        RAISE NOTICE 'Notifications table already exists';
    END IF;
END
$$;

-- 2. Create usage_tracking table (safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'usage_tracking') THEN
        CREATE TABLE usage_tracking (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            searches_count INTEGER DEFAULT 0,
            api_calls_count INTEGER DEFAULT 0,
            storage_used BIGINT DEFAULT 0,
            bandwidth_used BIGINT DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, month, year)
        );
        
        -- Enable RLS
        ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view own usage" ON usage_tracking
          FOR SELECT USING (auth.uid() = user_id);
        
        -- Create indexes
        CREATE INDEX usage_tracking_user_id_idx ON usage_tracking(user_id);
        CREATE INDEX usage_tracking_date_idx ON usage_tracking(year, month);
        
        -- Create trigger for updated_at
        CREATE OR REPLACE FUNCTION handle_updated_at()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $trigger$ LANGUAGE plpgsql;
        
        CREATE TRIGGER handle_updated_at_usage_tracking
            BEFORE UPDATE ON usage_tracking
            FOR EACH ROW
            EXECUTE PROCEDURE handle_updated_at();
        
        RAISE NOTICE 'Created usage_tracking table';
    ELSE
        RAISE NOTICE 'Usage tracking table already exists';
    END IF;
END
$$;

-- 3. Create profiles table (safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE TABLE profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE,
            full_name TEXT,
            avatar_url TEXT,
            role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
            phone TEXT,
            company TEXT,
            bio TEXT,
            location TEXT,
            website TEXT,
            preferences JSONB DEFAULT '{}',
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view own profile" ON profiles
          FOR SELECT USING (auth.uid() = id);
        CREATE POLICY "Users can update own profile" ON profiles
          FOR UPDATE USING (auth.uid() = id);
        
        -- Create indexes
        CREATE INDEX profiles_email_idx ON profiles(email);
        CREATE INDEX profiles_role_idx ON profiles(role);
        
        -- Create trigger for updated_at
        CREATE TRIGGER handle_updated_at_profiles
            BEFORE UPDATE ON profiles
            FOR EACH ROW
            EXECUTE PROCEDURE handle_updated_at();
        
        RAISE NOTICE 'Created profiles table';
    ELSE
        RAISE NOTICE 'Profiles table already exists';
    END IF;
END
$$;

-- 4. Create or update subscriptions table (safe)
DO $$
DECLARE
    has_tier BOOLEAN := FALSE;
    has_status BOOLEAN := FALSE;
    has_stripe_customer_id BOOLEAN := FALSE;
    has_stripe_subscription_id BOOLEAN := FALSE;
    has_current_period_start BOOLEAN := FALSE;
    has_current_period_end BOOLEAN := FALSE;
    has_cancel_at_period_end BOOLEAN := FALSE;
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
        CREATE TABLE subscriptions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            current_period_start TIMESTAMP WITH TIME ZONE,
            current_period_end TIMESTAMP WITH TIME ZONE,
            cancel_at_period_end BOOLEAN DEFAULT FALSE,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view own subscription" ON subscriptions
          FOR SELECT USING (auth.uid() = user_id);
        
        -- Create indexes
        CREATE INDEX subscriptions_user_id_idx ON subscriptions(user_id);
        CREATE INDEX subscriptions_status_idx ON subscriptions(status);
        CREATE INDEX subscriptions_stripe_customer_idx ON subscriptions(stripe_customer_id);
        
        -- Create trigger for updated_at
        CREATE TRIGGER handle_updated_at_subscriptions
            BEFORE UPDATE ON subscriptions
            FOR EACH ROW
            EXECUTE PROCEDURE handle_updated_at();
        
        RAISE NOTICE 'Created subscriptions table';
    ELSE
        RAISE NOTICE 'Subscriptions table already exists - checking for missing columns';
        
        -- Check for required columns and add them if missing
        SELECT EXISTS (
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'subscriptions' AND table_schema = 'public' AND column_name = 'tier'
        ) INTO has_tier;
        
        SELECT EXISTS (
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'subscriptions' AND table_schema = 'public' AND column_name = 'status'
        ) INTO has_status;
        
        SELECT EXISTS (
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'subscriptions' AND table_schema = 'public' AND column_name = 'stripe_customer_id'
        ) INTO has_stripe_customer_id;
        
        SELECT EXISTS (
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'subscriptions' AND table_schema = 'public' AND column_name = 'stripe_subscription_id'
        ) INTO has_stripe_subscription_id;
        
        SELECT EXISTS (
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'subscriptions' AND table_schema = 'public' AND column_name = 'current_period_start'
        ) INTO has_current_period_start;
        
        SELECT EXISTS (
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'subscriptions' AND table_schema = 'public' AND column_name = 'current_period_end'
        ) INTO has_current_period_end;
        
        SELECT EXISTS (
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'subscriptions' AND table_schema = 'public' AND column_name = 'cancel_at_period_end'
        ) INTO has_cancel_at_period_end;
        
        -- Add missing columns
        IF NOT has_tier THEN
            ALTER TABLE subscriptions ADD COLUMN tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise'));
            RAISE NOTICE 'Added tier column to subscriptions table';
        END IF;
        
        IF NOT has_status THEN
            ALTER TABLE subscriptions ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing'));
            RAISE NOTICE 'Added status column to subscriptions table';
        END IF;
        
        IF NOT has_stripe_customer_id THEN
            ALTER TABLE subscriptions ADD COLUMN stripe_customer_id TEXT;
            RAISE NOTICE 'Added stripe_customer_id column to subscriptions table';
        END IF;
        
        IF NOT has_stripe_subscription_id THEN
            ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id TEXT;
            RAISE NOTICE 'Added stripe_subscription_id column to subscriptions table';
        END IF;
        
        IF NOT has_current_period_start THEN
            ALTER TABLE subscriptions ADD COLUMN current_period_start TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE 'Added current_period_start column to subscriptions table';
        END IF;
        
        IF NOT has_current_period_end THEN
            ALTER TABLE subscriptions ADD COLUMN current_period_end TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE 'Added current_period_end column to subscriptions table';
        END IF;
        
        IF NOT has_cancel_at_period_end THEN
            ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Added cancel_at_period_end column to subscriptions table';
        END IF;
    END IF;
END
$$;

-- 5. Create payment_methods table (safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_methods') THEN
        CREATE TABLE payment_methods (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            provider TEXT NOT NULL DEFAULT 'stripe',
            api_key TEXT NOT NULL,
            secret_key TEXT,
            webhook_secret TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            test_mode BOOLEAN DEFAULT TRUE,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
        
        -- Create admin policies
        CREATE POLICY "Admins can manage payment methods" ON payment_methods
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE profiles.id = auth.uid() 
              AND profiles.role IN ('admin', 'super_admin')
            )
          );
        
        -- Create indexes
        CREATE INDEX payment_methods_provider_idx ON payment_methods(provider);
        CREATE INDEX payment_methods_is_active_idx ON payment_methods(is_active);
        
        -- Create trigger for updated_at
        CREATE TRIGGER handle_updated_at_payment_methods
            BEFORE UPDATE ON payment_methods
            FOR EACH ROW
            EXECUTE PROCEDURE handle_updated_at();
        
        -- Insert default test Stripe configuration
        INSERT INTO payment_methods (provider, api_key, is_active, test_mode) 
        VALUES ('stripe', 'sk_test_your_stripe_secret_key_here', true, true);
        
        RAISE NOTICE 'Created payment_methods table with default Stripe config';
    ELSE
        RAISE NOTICE 'Payment methods table already exists';
    END IF;
END
$$;

-- 6. Initialize data for existing users
DO $$
BEGIN
    -- Create usage tracking entries for current month
    INSERT INTO usage_tracking (user_id, month, year, searches_count, api_calls_count, storage_used)
    SELECT 
        id as user_id,
        EXTRACT(MONTH FROM NOW()) as month,
        EXTRACT(YEAR FROM NOW()) as year,
        0 as searches_count,
        0 as api_calls_count,
        0 as storage_used
    FROM auth.users
    ON CONFLICT (user_id, month, year) DO NOTHING;
    
    -- Create default subscriptions for existing users (only if all required columns exist)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND table_schema = 'public' AND column_name = 'tier'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND table_schema = 'public' AND column_name = 'status'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND table_schema = 'public' AND column_name = 'current_period_start'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND table_schema = 'public' AND column_name = 'current_period_end'
    ) THEN
        INSERT INTO subscriptions (user_id, tier, status, current_period_start, current_period_end)
        SELECT 
            id as user_id,
            'free' as tier,
            'active' as status,
            NOW() as current_period_start,
            NOW() + INTERVAL '30 days' as current_period_end
        FROM auth.users
        WHERE NOT EXISTS (
            SELECT 1 FROM subscriptions WHERE subscriptions.user_id = auth.users.id
        );
        
        RAISE NOTICE 'Created default subscriptions for existing users';
    ELSE
        RAISE NOTICE 'Skipped subscription creation - required columns not available';
    END IF;
    
END
$$;

SELECT 'Safe database migration completed successfully!' as result; 