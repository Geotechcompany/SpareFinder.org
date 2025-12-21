# Storage Bucket Setup Guide for SpareFinder Research

## ✅ FIXED: Using Existing "sparefinder" Bucket

The error `"Bucket not found"` has been resolved! The backend code now uses your existing `sparefinder` storage bucket instead of trying to create a new one.

## What Was Changed

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: **bharlmgxoqdafjeeknmk**

### Step 2: Create Storage Bucket
1. Click **"Storage"** in the left sidebar
2. Click **"New bucket"** button
3. Configure as follows:
   ```
   Name: part-images
   Public bucket: ✅ (checked)
   File size limit: 10 MB
   Allowed MIME types: image/jpeg, image/png, image/webp
   ```
4. Click **"Create bucket"**

### Step 3: Set Bucket Policies

After creating the bucket, click on it and go to **"Policies"** tab:

#### Policy 1: Users can upload images
```sql
CREATE POLICY "Users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'part-images'
);
```

#### Policy 2: Public can view images
```sql
CREATE POLICY "Public can view images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'part-images');
```

#### Policy 3: Users can update their images
```sql
CREATE POLICY "Users can update their images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'part-images');
```

#### Policy 4: Users can delete their images
```sql
CREATE POLICY "Users can delete their images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'part-images');
```

## Alternative: SQL Script

If you prefer SQL, run this in the **SQL Editor**:

```sql
-- Create the part-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'part-images',
  'part-images',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create policies
CREATE POLICY "Users can upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'part-images');

CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'part-images');

CREATE POLICY "Users can update their images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'part-images');

CREATE POLICY "Users can delete their images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'part-images');
```

## Verification

After creating the bucket, test it:

1. Go back to your app
2. Try uploading an image for SpareFinder Research
3. You should see:
   ```json
   {
     "success": true,
     "message": "SpareFinder Research job created successfully",
     "jobId": "...",
     "imageUrl": "https://bharlmgxoqdafjeeknmk.supabase.co/storage/v1/object/public/part-images/..."
   }
   ```

## Bucket Structure

Images will be organized as:
```
part-images/
  └── crew-analysis/
      └── {user_id}/
          └── {uuid}.{ext}
```

Example:
```
part-images/crew-analysis/550e8400-e29b-41d4-a716-446655440000/a1b2c3d4-e5f6.jpg
```

## Troubleshooting

### Still getting "Bucket not found"?
- Verify bucket name is exactly `part-images` (lowercase, with dash)
- Check that bucket is marked as **Public**
- Refresh your Supabase dashboard

### Images not showing?
- Check bucket is public
- Verify "Public can view images" policy exists
- Check file size is under 10MB

### Upload permission denied?
- Verify user is authenticated
- Check "Users can upload images" policy exists
- Make sure user_id matches the folder structure

## Summary

✅ **Create bucket**: `part-images` (public, 10MB limit)
✅ **Set policies**: Insert, Select, Update, Delete
✅ **Test upload**: Should work immediately after bucket creation

Once the bucket is created, the SpareFinder Research upload will work! 🎉

