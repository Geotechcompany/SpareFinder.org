# 🚀 Render Deployment Guide

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Environment Variables**: Have your API keys ready

---

## 📋 Deployment Options

### Option 1: Deploy via Render Dashboard (Recommended)

#### Step 1: Prepare Your Repository

```bash
# Initialize git if not already done
cd backend
git init
git add .
git commit -m "Initial commit for Render deployment"

# Push to GitHub
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

#### Step 2: Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the repository containing your backend

#### Step 3: Configure Service

**Basic Settings:**
- **Name**: `ai-spare-part-analyzer-api`
- **Region**: Oregon (or closest to your users)
- **Branch**: `main`
- **Root Directory**: `backend` (if your backend is in a subdirectory)
- **Environment**: `Docker`
- **Dockerfile Path**: `./Dockerfile`
- **Plan**: `Starter` ($7/month) or `Free` (with limitations)

**Advanced Settings:**
- **Health Check Path**: `/health`
- **Auto-Deploy**: `Yes` (deploy on every push)

#### Step 4: Add Environment Variables

In the Render Dashboard, add these environment variables:

```env
OPENAI_API_KEY=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

GMAIL_USER=arthurbreck417@gmail.com
GMAIL_PASS=wyca ijxc ddth ddqa

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_AUTH_METHOD=PLAIN

PORT=8000
OTEL_SDK_DISABLED=true
```

**🔒 Security Note**: These are marked as "secret" in Render (not visible in logs)

#### Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Pull your code from GitHub
   - Build the Docker image
   - Deploy the container
   - Assign a public URL (e.g., `https://ai-spare-part-analyzer-api.onrender.com`)

**Build Time**: ~5-10 minutes for first deployment

---

### Option 2: Deploy via render.yaml (Blueprint)

#### Step 1: Push render.yaml to Repository

The `render.yaml` file is already created in your backend directory.

```bash
cd backend
git add render.yaml Dockerfile .dockerignore
git commit -m "Add Render deployment configuration"
git push
```

#### Step 2: Deploy from Blueprint

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and configure automatically
5. Add environment variables when prompted
6. Click **"Apply"**

---

## 🔧 Configuration Details

### Dockerfile Optimizations

✅ Multi-stage builds for smaller images  
✅ Python 3.12 slim base image  
✅ Dependency caching for faster rebuilds  
✅ Health check endpoint  
✅ Production-ready uvicorn configuration  

### Health Check

Endpoint: `GET /health`

Response:
```json
{
  "status": "healthy",
  "service": "AI Spare Part Analyzer API",
  "timestamp": "2025-11-01T20:15:30.123456"
}
```

### WebSocket Support

Render fully supports WebSocket connections on all plans.

Your WebSocket endpoint: `wss://your-app.onrender.com/ws/progress`

---

## 🌐 Post-Deployment

### 1. Get Your API URL

After deployment, Render provides:
```
https://ai-spare-part-analyzer-api.onrender.com
```

### 2. Update Frontend

In your frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://ai-spare-part-analyzer-api.onrender.com
```

### 3. Test the Deployment

```bash
# Health check
curl https://ai-spare-part-analyzer-api.onrender.com/health

# Root endpoint
curl https://ai-spare-part-analyzer-api.onrender.com/

# Expected response:
{
  "message": "AI Spare Part Analyzer API",
  "status": "running",
  "version": "2.0.0",
  "endpoints": {
    "health": "/health",
    "websocket": "/ws/progress"
  }
}
```

### 4. Test WebSocket Connection

From your frontend or use a WebSocket client:
```javascript
const ws = new WebSocket('wss://ai-spare-part-analyzer-api.onrender.com/ws/progress')
```

---

## 📊 Render Plans Comparison

### Free Plan
- ✅ Docker support
- ✅ WebSocket support
- ✅ 512 MB RAM
- ✅ 0.1 CPU
- ⚠️ Spins down after 15 min inactivity
- ⚠️ 750 hours/month limit

### Starter Plan ($7/month)
- ✅ Always on (no spin-down)
- ✅ 512 MB RAM
- ✅ 0.5 CPU
- ✅ Custom domains
- ✅ Unlimited hours

**Recommendation**: Use **Starter** for production (no cold starts)

---

## 🔄 Auto-Deploy Setup

Your service will automatically redeploy when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update report formatting"
git push

# Render automatically:
# 1. Detects the push
# 2. Pulls latest code
# 3. Rebuilds Docker image
# 4. Deploys new version
# 5. Runs health checks
# 6. Switches traffic (zero downtime)
```

---

## 📝 Environment Variable Management

### Via Dashboard
1. Go to your service in Render Dashboard
2. Click **"Environment"** tab
3. Add/Edit/Delete variables
4. Click **"Save Changes"** (triggers redeploy)

### Via render.yaml
Update `render.yaml` and push to GitHub

---

## 🐛 Troubleshooting

### Build Fails

**Check logs in Render Dashboard:**
```
Logs → Deploy Logs
```

**Common issues:**
- Missing dependencies in `requirements.txt`
- Docker build errors
- Port conflicts

### Service Won't Start

**Check runtime logs:**
```
Logs → Runtime Logs
```

**Common issues:**
- Missing environment variables
- Import errors
- Port binding issues

### WebSocket Connection Fails

**Verify:**
1. Health check is passing: `GET /health`
2. Use `wss://` not `ws://` for Render URLs
3. Check CORS settings in `main.py`

### Health Check Failing

**Check:**
- Health endpoint responds: `/health`
- Service is listening on correct port (8000)
- No startup errors in logs

---

## 🎯 Performance Optimization

### 1. Docker Image Size
Current optimizations:
- Slim Python base image (~150 MB)
- Multi-stage build
- .dockerignore excludes unnecessary files

### 2. Cold Start (Free Plan)
If using Free plan:
- First request after 15 min: ~30-60 sec cold start
- Solution: Upgrade to Starter plan ($7/month)

### 3. Resource Limits
- Free: 512 MB RAM, 0.1 CPU
- Starter: 512 MB RAM, 0.5 CPU
- Standard: 2 GB RAM, 1 CPU

**Monitor in Dashboard**: `Metrics` tab

---

## 🔐 Security Best Practices

### 1. Environment Variables
✅ Never commit `.env` file  
✅ Use Render's secret management  
✅ Rotate API keys regularly  

### 2. CORS Configuration
Already configured in `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Production**: Replace `["*"]` with your frontend domain

### 3. HTTPS
✅ Render provides free SSL certificates  
✅ All traffic encrypted by default  
✅ Automatic certificate renewal  

---

## 📈 Monitoring

### Built-in Metrics (Render Dashboard)

- **Requests**: Request rate and errors
- **Response Time**: P50, P95, P99 latency
- **CPU/Memory**: Resource usage over time
- **Health Checks**: Uptime monitoring

### Custom Monitoring

Add logging:
```python
import logging
logging.info(f"Analysis started for {user_email}")
```

View in: `Logs → Runtime Logs`

---

## 🎉 Success!

Your backend is now deployed! 

**Your API URL**: `https://ai-spare-part-analyzer-api.onrender.com`

Next steps:
1. ✅ Deploy frontend to Vercel
2. ✅ Update frontend with backend URL
3. ✅ Test end-to-end workflow
4. ✅ Monitor performance

---

## 🆘 Need Help?

- **Render Docs**: [docs.render.com](https://docs.render.com)
- **Community**: [Render Community Forum](https://community.render.com)
- **Status**: [status.render.com](https://status.render.com)

---

Generated: 2025-11-01  
Version: 2.0

