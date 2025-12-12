-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Part Analyses Table
CREATE TABLE public.part_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Image Details
    image_id UUID,
    image_url TEXT,
    image_filename TEXT,
    
    -- Part Information
    part_name TEXT,
    part_number TEXT,
    category TEXT,
    manufacturer TEXT,
    
    -- Analysis Metadata
    confidence_score REAL CHECK (confidence_score BETWEEN 0 AND 1),
    description TEXT,
    
    -- Full Analysis in JSONB for flexibility
    full_analysis JSONB,
    
    -- Purchasing Information
    estimated_price TEXT,
    purchasing_sources JSONB,
    
    -- Technical Specifications
    technical_details JSONB,
    
    -- Compatibility
    compatible_vehicles TEXT[],
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_part_analyses_user_id ON public.part_analyses(user_id);
CREATE INDEX idx_part_analyses_part_name ON public.part_analyses(part_name);
CREATE INDEX idx_part_analyses_category ON public.part_analyses(category);
CREATE INDEX idx_part_analyses_manufacturer ON public.part_analyses(manufacturer);

-- Row Level Security Policies for Part Analyses
ALTER TABLE public.part_analyses ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own analyses
CREATE POLICY "Users can insert their own analyses" 
ON public.part_analyses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only view their own analyses
CREATE POLICY "Users can view their own analyses" 
ON public.part_analyses FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only update their own analyses
CREATE POLICY "Users can update their own analyses" 
ON public.part_analyses FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can only delete their own analyses
CREATE POLICY "Users can delete their own analyses" 
ON public.part_analyses FOR DELETE 
USING (auth.uid() = user_id);

-- Search History Table
CREATE TABLE public.search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Search Parameters
    search_term TEXT,
    search_type TEXT, -- e.g., 'part_name', 'category', 'manufacturer'
    
    -- Search Results
    results_count INTEGER,
    results_details JSONB,
    
    -- Metadata
    device_info JSONB,
    location_info JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Search History
CREATE INDEX idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX idx_search_history_search_term ON public.search_history(search_term);

-- Row Level Security for Search History
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own search history" 
ON public.search_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own search history" 
ON public.search_history FOR SELECT 
USING (auth.uid() = user_id);

-- User Preferences Table
CREATE TABLE public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- UI Preferences
    theme_preference TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
    language_preference TEXT DEFAULT 'en',
    
    -- Notification Settings
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT FALSE,
    
    -- Analysis Preferences
    default_confidence_threshold REAL DEFAULT 0.7,
    default_max_predictions INTEGER DEFAULT 3,
    
    -- Privacy & Data Sharing
    data_sharing_consent BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for User Preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences" 
ON public.user_preferences FOR ALL 
USING (auth.uid() = user_id);

-- Trigger to automatically create user preferences when a new user is created
CREATE OR REPLACE FUNCTION public.create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_user_preferences_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_user_preferences();

-- Optional: Billing/Subscription Table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Subscription Details
    plan_type TEXT, -- 'free', 'pro', 'enterprise'
    status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'expired'
    
    -- Billing Information
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    
    -- Payment Details
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    
    -- Usage Tracking
    total_analyses_count INTEGER DEFAULT 0,
    last_analysis_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Subscriptions
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- Row Level Security for Subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription" 
ON public.subscriptions FOR SELECT 
USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE public.part_analyses IS 'Stores detailed analyses of Engineering spares parts with user-specific access';
COMMENT ON TABLE public.search_history IS 'Tracks user search activities with privacy controls';
COMMENT ON TABLE public.user_preferences IS 'Manages individual user preferences and settings';
COMMENT ON TABLE public.subscriptions IS 'Manages user subscription and billing information'; 