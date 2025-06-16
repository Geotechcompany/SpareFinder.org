# 🚀 SpareFinder AI - Render Deployment Guide

## Overview
This guide will help you deploy the complete SpareFinder AI application to Render, including:
- ✅ **Backend API** (Node.js/Express)
- ✅ **AI Service** (Python/FastAPI)
- ✅ **Frontend** (Already on Netlify)
- ✅ **Database** (Supabase - already configured)

## Prerequisites
- GitHub repository with your code
- Render account (free tier available)
- Supabase project with database setup
- Environment variables ready

---

## 🎯 **Step 1: Deploy Backend to Render**

### 1.1 Create Backend Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `sparefinder-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`
   - **Instance Type**: `Starter` (free tier)

### 1.2 Add Environment Variables
In the Render dashboard, add these environment variables:

```bash
NODE_ENV=production
PORT=10000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
FRONTEND_URL=https://your-netlify-app.netlify.app
AI_SERVICE_URL=https://sparefinder-ai-service.onrender.com
ALLOWED_ORIGINS=https://your-netlify-app.netlify.app,http://localhost:5173
```

### 1.3 Deploy
- Click **"Create Web Service"**
- Wait for deployment (5-10 minutes)
- Note your backend URL: `https://sparefinder-backend.onrender.com`

---

## 🤖 **Step 2: Deploy AI Service to Render**

### 2.1 Create AI Service
1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect the same GitHub repository
3. Configure the service:
   - **Name**: `sparefinder-ai-service`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./ai-service/Dockerfile`
   - **Docker Context**: `./ai-service`
   - **Instance Type**: `Starter` (free tier)

### 2.2 Add Environment Variables
```bash
PORT=10000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
API_KEY=your_ai_service_api_key
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_google_search_engine_id
PYTHONUNBUFFERED=1
ENVIRONMENT=production
```

### 2.3 Deploy
- Click **"Create Web Service"**
- Wait for deployment (10-15 minutes for Docker build)
- Note your AI service URL: `https://sparefinder-ai-service.onrender.com`

---

## 🌐 **Step 3: Update Frontend Configuration**

### 3.1 Update Netlify Environment Variables
In your Netlify dashboard, update these environment variables:

```bash
VITE_API_URL=https://sparefinder-backend.onrender.com
VITE_AI_SERVICE_URL=https://sparefinder-ai-service.onrender.com
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3.2 Redeploy Frontend
- Trigger a new deployment in Netlify
- Or push a commit to trigger auto-deployment

---

## 🔧 **Step 4: Update Backend Configuration**

Update the backend's AI_SERVICE_URL environment variable in Render:
```bash
AI_SERVICE_URL=https://sparefinder-ai-service.onrender.com
```

---

## ✅ **Step 5: Verify Deployment**

### 5.1 Health Checks
Test these endpoints:

**Backend Health:**
```bash
curl https://sparefinder-backend.onrender.com/health
```

**AI Service Health:**
```bash
curl https://sparefinder-ai-service.onrender.com/health
```

### 5.2 Test Complete Flow
1. Visit your Netlify frontend URL
2. Register/login to test authentication
3. Upload an image to test AI processing
4. Check admin dashboard functionality

---

## 🚨 **Important Notes**

### Free Tier Limitations
- **Render Free Tier**: Services sleep after 15 minutes of inactivity
- **Cold Start**: First request after sleep takes 30-60 seconds
- **Monthly Hours**: 750 hours/month per service

### Performance Tips
1. **Keep Services Warm**: Use a service like UptimeRobot to ping your services every 14 minutes
2. **Optimize Docker**: The AI service Docker image is optimized for faster builds
3. **Database**: Supabase handles scaling automatically

### Monitoring
- Check Render logs for any deployment issues
- Monitor service health via Render dashboard
- Set up alerts for service downtime

---

## 🔄 **Step 6: Automated Deployment (Optional)**

### 6.1 Auto-Deploy on Git Push
Both services are configured to auto-deploy when you push to your main branch.

### 6.2 Using render.yaml (Alternative)
You can also use the included `render.yaml` file for infrastructure-as-code deployment:

1. In Render Dashboard, click **"New +"** → **"Blueprint"**
2. Connect your repository
3. Render will automatically detect the `render.yaml` file
4. Add environment variables as prompted
5. Deploy both services simultaneously

---

## 🆘 **Troubleshooting**

### Common Issues

**Backend Build Fails:**
```bash
# Check if TypeScript compiles locally
cd backend
npm install
npm run build
```

**AI Service Docker Build Fails:**
```bash
# Test Docker build locally
cd ai-service
docker build -t test-ai-service .
docker run -p 8000:8000 test-ai-service
```

**Services Can't Connect:**
- Verify environment variables are set correctly
- Check CORS settings in backend
- Ensure URLs don't have trailing slashes

**Database Connection Issues:**
- Verify Supabase URL and keys
- Check Supabase project is active
- Test connection from local environment first

### Getting Help
- Check Render logs in the dashboard
- Review this guide step-by-step
- Test each service individually
- Verify all environment variables

---

## 🎉 **Success!**

Your SpareFinder AI application should now be fully deployed and running on:
- **Frontend**: Netlify
- **Backend**: Render
- **AI Service**: Render  
- **Database**: Supabase

The complete stack is now live and ready for production use!
