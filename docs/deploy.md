# 🚀 SpareFinder AI - Complete Deployment Guide

## Current Status
- ✅ **Frontend**: Already deployed to Netlify
- ⏳ **Backend**: Needs deployment
- ⏳ **AI Service**: Needs deployment
- ✅ **Database**: Supabase (already configured)

## 1. Backend Deployment

### Option A: Railway (Recommended)
1. Go to [Railway.app](https://railway.app)
2. Connect your GitHub repository
3. Select the `backend` folder
4. Add environment variables:
   ```
   NODE_ENV=production
   PORT=4000
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   JWT_SECRET=your_jwt_secret
   FRONTEND_URL=https://your-netlify-app.netlify.app
   AI_SERVICE_URL=https://your-ai-service-url
   ```
5. Deploy automatically

### Option B: Render
1. Go to [Render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repo, select `backend` folder
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`
6. Add same environment variables as above

### Option C: Vercel (Serverless)
1. Install Vercel CLI: `npm i -g vercel`
2. In backend folder: `vercel`
3. Follow prompts and add environment variables

## 2. AI Service Deployment

### Option A: Railway (Docker)
1. Create new service in Railway
2. Connect to same GitHub repo
3. Select `ai-service` folder
4. Railway will auto-detect Dockerfile
5. Add environment variables:
   ```
   PORT=8000
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   ```

### Option B: Render (Docker)
1. Create new Web Service
2. Select Docker environment
3. Dockerfile path: `./Dockerfile`
4. Add environment variables

### Option C: Google Cloud Run
1. Build and push Docker image:
   ```bash
   cd ai-service
   docker build -t gcr.io/your-project/sparefinder-ai .
   docker push gcr.io/your-project/sparefinder-ai
   ```
2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy sparefinder-ai \
     --image gcr.io/your-project/sparefinder-ai \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

## 3. Update Frontend Configuration

After deploying backend and AI service, update your Netlify environment variables:

```
VITE_API_URL=https://your-backend-url.railway.app
VITE_AI_SERVICE_URL=https://your-ai-service-url.railway.app
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 4. Domain Configuration (Optional)

### Custom Domain for Backend
1. In Railway/Render dashboard
2. Go to Settings > Domains
3. Add your custom domain
4. Update DNS records

### Custom Domain for AI Service
1. Same process as backend
2. Update frontend environment variables

## 5. Environment Variables Checklist

### Backend (.env)
```
NODE_ENV=production
PORT=4000
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
FRONTEND_URL=
AI_SERVICE_URL=
ALLOWED_ORIGINS=
```

### AI Service (.env)
```
PORT=8000
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
MODEL_PATH=/app/models
LOG_LEVEL=INFO
```

### Frontend (Netlify)
```
VITE_API_URL=
VITE_AI_SERVICE_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## 6. Quick Deploy Commands

### Deploy Backend to Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
cd backend
railway up
```

### Deploy AI Service to Railway
```bash
cd ai-service
railway up
```

### Update Frontend
```bash
# Update environment variables in Netlify dashboard
# Or redeploy with new env vars
```

## 7. Health Checks

After deployment, verify:
- ✅ Backend health: `https://your-backend-url/health`
- ✅ AI Service health: `https://your-ai-service-url/health`
- ✅ Frontend loads and connects to backend
- ✅ Image upload and AI processing works

## 8. Monitoring & Logs

### Railway
- View logs in Railway dashboard
- Set up alerts for downtime

### Render
- View logs in Render dashboard
- Configure health checks

## 9. Scaling Considerations

### Backend
- Start with basic plan
- Scale based on user traffic
- Consider Redis for session storage

### AI Service
- Requires more CPU/memory
- Consider GPU instances for better performance
- Implement request queuing for high load

## 10. Security Checklist

- ✅ Environment variables secured
- ✅ CORS properly configured
- ✅ Rate limiting enabled
- ✅ HTTPS enforced
- ✅ Database RLS policies active
- ✅ API keys rotated regularly

## Need Help?

1. Check deployment logs for errors
2. Verify environment variables
3. Test API endpoints individually
4. Check CORS configuration
5. Verify database connections

## Recommended Deployment Order

1. **Deploy Backend first** (Railway/Render)
2. **Deploy AI Service** (Railway/Render)
3. **Update Frontend env vars** (Netlify)
4. **Test full application flow**
5. **Set up monitoring and alerts**

# 🚀 Quick Deploy to Render

## ✅ Pre-Deployment Checklist Complete
- Backend builds successfully ✅
- AI service Docker ready ✅
- All TypeScript errors fixed ✅
- Configuration files ready ✅

## 🎯 Deploy Steps

### 1. Backend Deployment
```bash
# Render Dashboard → New Web Service
Name: sparefinder-backend
Environment: Node
Build: cd backend && npm install && npm run build
Start: cd backend && npm start
```

**Environment Variables:**
```
NODE_ENV=production
PORT=10000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_jwt_secret_32_chars_min
FRONTEND_URL=https://your-netlify-app.netlify.app
AI_SERVICE_URL=https://sparefinder-ai-service.onrender.com
ALLOWED_ORIGINS=https://your-netlify-app.netlify.app
```

### 2. AI Service Deployment
```bash
# Render Dashboard → New Web Service
Name: sparefinder-ai-service
Environment: Docker
Dockerfile: ./ai-service/Dockerfile
Context: ./ai-service
```

**Environment Variables:**
```
PORT=10000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
API_KEY=your_ai_api_key
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
PYTHONUNBUFFERED=1
ENVIRONMENT=production
```

### 3. Update Frontend (Netlify)
```bash
VITE_API_URL=https://sparefinder-backend.onrender.com
VITE_AI_SERVICE_URL=https://sparefinder-ai-service.onrender.com
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🔗 Health Check URLs
- Backend: `https://sparefinder-backend.onrender.com/health`
- AI Service: `https://sparefinder-ai-service.onrender.com/health`

## 📋 Deployment Order
1. Deploy Backend first (get URL)
2. Deploy AI Service second (get URL)
3. Update Backend AI_SERVICE_URL
4. Update Frontend URLs
5. Test complete flow

## 🎉 Ready to Deploy!
All files are prepared and ready for Render deployment. 