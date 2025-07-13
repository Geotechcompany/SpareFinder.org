# Render Deployment Guide

## Frontend Environment Variables

**CRITICAL:** In your Render dashboard for the frontend service, you MUST set these environment variables:

### Required Environment Variables:
```
VITE_API_URL=https://part-finder-ai-vision.onrender.com
VITE_API_BASE_URL=https://part-finder-ai-vision.onrender.com

VITE_SUPABASE_URL=https://qhtysayouknqrsdxniam.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFodHlzYXl
vdWtucXJzZHhuaWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2Mzc4OTIsImV4cCI6MjA2NTIxMzg5Mn0.mowEWw95jAG48hiOfxx6TsS
cyzIHcyNYeugWEtlNFME

VITE_AI_SERVICE_URL=https://part-finder-ai-vision-1.onrender.com
VITE_AI_SERVICE_API_KEY=geotech-dev-key-2024

VITE_APP_NAME=SpareFinder
VITE_APP_URL=https://your-frontend-app.onrender.com
NODE_ENV=production
```

## How to Set Environment Variables in Render:

1. Go to your Render dashboard
2. Select your frontend service
3. Navigate to "Environment" tab
4. Click "Add Environment Variable"
5. Add each variable above with the correct values

## Build Configuration:

Make sure your Render service has:
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run preview` or use static site hosting
- **Publish Directory:** `dist`

## Common Issues:

### 1. Still calling localhost:4000?
- Check that `VITE_API_URL` and `VITE_API_BASE_URL` are both set in Render dashboard
- Redeploy after setting environment variables

### 2. API calls failing?
- Verify the backend service URL is correct
- Check that backend service is running and accessible
- Verify CORS configuration allows your frontend domain

### 3. Build fails?
- Check Node.js version (should be 18+)
- Verify all dependencies are in package.json
- Check build logs for specific errors

## Testing:

After deployment, check browser console for:
```
🔧 API Client Config: {
  baseURL: 'https://part-finder-ai-vision.onrender.com/api',
  environment: 'production'
}
```

If you see localhost URLs, environment variables are not properly set. 