# 🚀 GeoTech PartFinder AI - Complete Supabase Setup Guide

## Overview

This guide will help you set up a complete Supabase backend for the GeoTech PartFinder AI application, including authentication, database, storage, and all necessary configurations.

## Prerequisites

- Supabase account (sign up at [supabase.com](https://supabase.com))
- Basic understanding of SQL and database concepts

## Step 1: Create New Supabase Project

1. **Log in to Supabase Dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Sign in to your account

2. **Create New Project**
   - Click "New Project"
   - Choose your organization
   - Enter project details:
     - **Name**: `geotech-partfinder-ai`
     - **Database Password**: Generate a strong password (save this!)
     - **Region**: Choose closest to your users
     - **Pricing Plan**: Start with Free tier

3. **Wait for Project Setup**
   - This usually takes 2-3 minutes
   - Note down your project URL and API keys

## Step 2: Configure Environment Variables

1. **Get Your Project Credentials**
   - Go to Settings → API
   - Copy the following:
     - **Project URL**: `https://your-project-ref.supabase.co`
     - **Anon Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
     - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep this secret!)

2. **Create Environment File**
   ```bash
   # Copy from template
   cp env.template .env
   
   # Or create manually
   nano .env
   ```

3. **Update .env File**
   ```env
   # Replace with your actual values
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 3: Set Up Database Schema

1. **Open SQL Editor**
   - In Supabase Dashboard, go to SQL Editor
   - Click "New Query"

2. **Run Database Setup Script**
   - Copy the entire contents of `database-setup.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

3. **Verify Tables Created**
   - Go to Table Editor
   - You should see these tables:
     - `profiles`
     - `subscriptions`
     - `usage_tracking`
     - `part_searches`
     - `search_analytics`
     - `user_activities`
     - `notifications`

## Step 4: Configure Authentication

### Enable Email Authentication
1. **Go to Authentication → Settings**
2. **Enable Email Provider**
   - Confirm URL: `https://yourdomain.com/auth/confirm`
   - Reset Password URL: `https://yourdomain.com/auth/reset-password`

### Enable OAuth Providers (Optional)
1. **Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Copy Client ID and Secret to Supabase

2. **GitHub OAuth**
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Create new OAuth App
   - Authorization callback URL: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Copy Client ID and Secret to Supabase

### Configure Email Templates
1. **Go to Authentication → Email Templates**
2. **Customize Templates** (optional):
   - Confirm signup
   - Reset password
   - Magic link

## Step 5: Set Up Storage (Optional)

### Create Storage Bucket
1. **Go to Storage**
2. **Create New Bucket**
   - Name: `part-images`
   - Public: `true` (for image viewing)

3. **Set Up Policies**
   ```sql
   -- Allow authenticated users to upload images
   CREATE POLICY "Users can upload own images" ON storage.objects
   FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);
   
   -- Allow public read access to images
   CREATE POLICY "Images are publicly accessible" ON storage.objects
   FOR SELECT USING (bucket_id = 'part-images');
   ```

## Step 6: Set Up Row Level Security (RLS)

The database setup script already includes RLS policies, but here's what they do:

### Profiles Table
- Users can view/update their own profile
- Admins can manage all profiles

### Part Searches
- Users can manage their own searches
- Admins can view all searches

### Subscriptions & Usage
- Users can view their own data
- Admins can manage all data

## Step 7: Configure Webhooks (Optional)

### For Stripe Integration
1. **Go to Database → Webhooks**
2. **Create New Webhook**
   - Name: `stripe-webhook`
   - Table: `subscriptions`
   - Events: `INSERT`, `UPDATE`
   - HTTP Method: `POST`
   - URL: `https://yourdomain.com/api/webhooks/stripe`

## Step 8: Set Up Realtime (Optional)

### Enable Realtime for Tables
1. **Go to Database → Replication**
2. **Add Tables to Replication**
   - `notifications` (for real-time notifications)
   - `user_activities` (for activity feeds)
   - `part_searches` (for search status updates)

## Step 9: Create First Admin User

### Method 1: Through Application
1. **Run the application**
2. **Sign up with your email**
3. **Go to SQL Editor and run**:
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```

### Method 2: Direct SQL Insert
```sql
-- Insert admin user directly
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@yourcompany.com',
  crypt('your-secure-password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- Create admin profile
INSERT INTO profiles (
  id,
  email,
  full_name,
  role
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@yourcompany.com'),
  'admin@yourcompany.com',
  'System Administrator',
  'admin'
);
```

## Step 10: Test the Setup

### Verify Database Connection
```bash
# Run your application
npm run dev

# Check browser console for errors
# Test user registration
# Test admin dashboard access
```

### Common Issues & Solutions

1. **Connection Error**
   - Check VITE_SUPABASE_URL format
   - Verify API key is correct
   - Ensure project is not paused

2. **Authentication Issues**
   - Confirm email templates are set
   - Check redirect URLs
   - Verify OAuth credentials

3. **Permission Errors**
   - Review RLS policies
   - Check user roles in database
   - Verify table permissions

## Step 11: Production Checklist

### Security
- [ ] Change default passwords
- [ ] Enable MFA for Supabase account
- [ ] Review and test all RLS policies
- [ ] Set up API rate limiting
- [ ] Configure CORS properly

### Performance
- [ ] Add database indexes
- [ ] Set up connection pooling
- [ ] Configure CDN for static assets
- [ ] Enable query optimization

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring
- [ ] Set up database backups
- [ ] Add performance monitoring

### Compliance
- [ ] Review data retention policies
- [ ] Set up audit logging
- [ ] Configure data encryption
- [ ] Document privacy procedures

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)

## Support

If you encounter issues:

1. Check the [Supabase Community](https://github.com/supabase/supabase/discussions)
2. Review application logs
3. Check browser developer console
4. Verify environment variables
5. Test with minimal configuration first

---

**🎉 Congratulations!** Your Supabase backend is now ready for the GeoTech PartFinder AI application. 