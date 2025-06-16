# Supabase Setup Guide for SpareFinder

## Phase 3: Authentication & Database Setup

This guide covers the complete setup of Supabase authentication and database schema for the GeoTech SpareFinder application.

## 1. Supabase Project Configuration

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://qhtysayouknqrsdxniam.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFodHlzYXlvdWtucXJzZHhuaWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2Mzc4OTIsImV4cCI6MjA2NTIxMzg5Mn0.mowEWw95jAG48hiOfxx6TsScyzIHcyNYeugWEtlNFME
```

## 2. Database Schema

### 2.1 Profiles Table
```sql
-- Create profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2.2 Part Searches Table
```sql
-- Create part_searches table
CREATE TABLE public.part_searches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT,
    image_name TEXT,
    image_size INTEGER,
    predictions JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence_score DECIMAL(5,4),
    processing_time INTEGER, -- milliseconds
    ai_model_version TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Set up RLS
ALTER TABLE public.part_searches ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own searches" ON public.part_searches
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own searches" ON public.part_searches
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own searches" ON public.part_searches
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_part_searches_user_id ON public.part_searches(user_id);
CREATE INDEX idx_part_searches_created_at ON public.part_searches(created_at DESC);
CREATE INDEX idx_part_searches_confidence ON public.part_searches(confidence_score DESC);
```

### 2.3 User Sessions Table (Optional - for analytics)
```sql
-- Create user_sessions table for analytics
CREATE TABLE public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    session_end TIMESTAMP WITH TIME ZONE,
    ip_address TEXT,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Set up RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert sessions" ON public.user_sessions
    FOR INSERT WITH CHECK (true);
```

### 2.4 API Usage Tracking
```sql
-- Create api_usage table for billing/analytics
CREATE TABLE public.api_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time INTEGER, -- milliseconds
    tokens_used INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Set up RLS
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own usage" ON public.api_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX idx_api_usage_created_at ON public.api_usage(created_at DESC);
CREATE INDEX idx_api_usage_endpoint ON public.api_usage(endpoint);
```

## 3. Authentication Configuration

### 3.1 Enable Auth Providers
In your Supabase dashboard:

1. Go to Authentication > Providers
2. Enable the following providers:
   - **Email** (already enabled)
   - **Google OAuth** (recommended)
   - **GitHub OAuth** (optional)

### 3.2 Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - **Authorized JavaScript origins**: `http://localhost:5173`, `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://qhtysayouknqrsdxniam.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret to Supabase

### 3.3 Email Templates
Customize email templates in Authentication > Email Templates:

**Confirm Signup:**
```html
<h2>Welcome to SpareFinder!</h2>
<p>Click the link below to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Account</a></p>
```

**Reset Password:**
```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

## 4. Storage Configuration

### 4.1 Create Storage Buckets
```sql
-- Create bucket for user profile images
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Create bucket for part images
INSERT INTO storage.buckets (id, name, public) VALUES ('part-images', 'part-images', true);

-- Create policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Create policies for part-images bucket
CREATE POLICY "Part images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'part-images');

CREATE POLICY "Authenticated users can upload part images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'part-images' AND 
        auth.role() = 'authenticated'
    );
```

## 5. Database Functions

### 5.1 Updated At Trigger Function
```sql
-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.part_searches
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

### 5.2 User Statistics Function
```sql
-- Function to get user statistics
CREATE OR REPLACE FUNCTION public.get_user_stats(user_uuid UUID)
RETURNS TABLE (
    total_searches INTEGER,
    successful_searches INTEGER,
    avg_confidence DECIMAL,
    total_processing_time INTEGER,
    searches_this_month INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_searches,
        COUNT(CASE WHEN confidence_score > 0.7 THEN 1 END)::INTEGER as successful_searches,
        AVG(confidence_score) as avg_confidence,
        SUM(processing_time)::INTEGER as total_processing_time,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END)::INTEGER as searches_this_month
    FROM public.part_searches
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 6. Testing the Setup

### 6.1 Test User Registration
```javascript
// Test in browser console
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123'
})
console.log('Signup result:', { data, error })
```

### 6.2 Test Profile Creation
```javascript
// After signup, check if profile was created
const { data: profile, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', 'test@example.com')
  .single()
console.log('Profile:', { profile, error })
```

### 6.3 Test Part Search Storage
```javascript
// Test storing a part search
const { data, error } = await supabase
  .from('part_searches')
  .insert([
    {
      user_id: 'user-uuid-here',
      predictions: [{ part_name: 'Test Part', confidence: 0.95 }],
      confidence_score: 0.95,
      processing_time: 1500
    }
  ])
console.log('Part search result:', { data, error })
```

## 7. Security Considerations

### 7.1 Row Level Security
- All tables have RLS enabled
- Users can only access their own data
- Admin users need special policies for management access

### 7.2 API Rate Limiting
Consider implementing rate limiting in your application:
```javascript
// Example rate limiting middleware
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}
```

### 7.3 Input Validation
Always validate and sanitize inputs:
```javascript
// Example validation
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
```

## 8. Monitoring and Analytics

### 8.1 Enable Supabase Analytics
1. Go to Reports in Supabase dashboard
2. Monitor API usage, authentication events
3. Set up alerts for unusual activity

### 8.2 Custom Analytics
Use the `api_usage` table to track:
- Popular AI model endpoints
- User engagement patterns  
- Performance metrics
- Cost analysis

## 9. Backup and Recovery

### 9.1 Database Backups
Supabase provides automatic daily backups. For additional safety:
1. Set up custom backup scripts
2. Export critical data regularly
3. Test restoration procedures

## 10. Deployment Notes

### 10.1 Environment Variables
Ensure production environment has:
```env
NEXT_PUBLIC_SUPABASE_URL=your-production-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

### 10.2 Domain Configuration
Update auth settings for production domain:
1. Site URL: `https://yourdomain.com`
2. Redirect URLs: `https://yourdomain.com/auth/callback`

This completes the Phase 3 Supabase setup for authentication and database infrastructure. 