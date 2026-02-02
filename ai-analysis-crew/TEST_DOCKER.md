# 🐳 Docker Local Testing Guide

Test your Docker deployment locally before pushing to Render.

---

## 🚀 Quick Start

### 1. Build the Docker Image

```bash
cd backend
docker build -t ai-spare-part-analyzer .
```

**Expected output:**
```
[+] Building 45.2s (12/12) FINISHED
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: 1.2kB
 => [internal] load .dockerignore
 => exporting to image
 => => naming to docker.io/library/ai-spare-part-analyzer
```

### 2. Run the Container

```bash
docker run -p 8000:8000 --env-file .env ai-spare-part-analyzer
```

**Or use Docker Compose (recommended):**

```bash
docker-compose up
```

### 3. Test the Deployment

**Health check:**
```bash
curl https://aiagent-sparefinder-org.onrender.com/health
```

**Root endpoint:**
```bash
curl https://aiagent-sparefinder-org.onrender.com/
```

**WebSocket (using wscat):**
```bash
npm install -g wscat
wscat -c ws://localhost:8000/ws/progress
```

---

## 🛠️ Docker Commands

### Build
```bash
# Build image
docker build -t ai-spare-part-analyzer .

# Build with no cache
docker build --no-cache -t ai-spare-part-analyzer .
```

### Run
```bash
# Run in foreground
docker run -p 8000:8000 --env-file .env ai-spare-part-analyzer

# Run in background (detached)
docker run -d -p 8000:8000 --env-file .env --name spare-part-api ai-spare-part-analyzer

# Run with volume mount (for development)
docker run -p 8000:8000 --env-file .env -v $(pwd):/app ai-spare-part-analyzer
```

### Manage
```bash
# List running containers
docker ps

# View logs
docker logs spare-part-api

# Follow logs
docker logs -f spare-part-api

# Stop container
docker stop spare-part-api

# Remove container
docker rm spare-part-api

# Remove image
docker rmi ai-spare-part-analyzer
```

### Docker Compose
```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build
```

---

## 🧪 Testing Checklist

Before deploying to Render, verify:

- [ ] ✅ Container builds successfully
- [ ] ✅ Container starts without errors
- [ ] ✅ Health check endpoint responds: `GET /health`
- [ ] ✅ Root endpoint responds: `GET /`
- [ ] ✅ WebSocket connection works: `ws://localhost:8000/ws/progress`
- [ ] ✅ Environment variables are loaded
- [ ] ✅ Temp directory is created
- [ ] ✅ No import errors in logs
- [ ] ✅ OpenAI API key is valid
- [ ] ✅ Gmail SMTP credentials work

---

## 📊 Image Size Optimization

Check your image size:
```bash
docker images | grep ai-spare-part-analyzer
```

**Expected size:** ~400-600 MB

**Optimize if needed:**
- Use `.dockerignore` to exclude unnecessary files
- Multi-stage builds (already implemented)
- Remove build dependencies after installation

---

## 🐛 Troubleshooting

### Container Exits Immediately

**Check logs:**
```bash
docker logs spare-part-api
```

**Common causes:**
- Missing environment variables
- Import errors
- Port already in use

### Cannot Access on Port 8000

**Verify port mapping:**
```bash
docker ps
```

**Check if port is in use:**
```bash
# Windows
netstat -ano | findstr :8000

# Linux/Mac
lsof -i :8000
```

### Environment Variables Not Loading

**Verify .env file exists:**
```bash
ls -la .env
```

**Test with explicit variables:**
```bash
docker run -p 8000:8000 -e OPENAI_API_KEY=your_key ai-spare-part-analyzer
```

### Health Check Failing

**Test manually:**
```bash
docker exec -it spare-part-api curl https://aiagent-sparefinder-org.onrender.com/health
```

### Module Not Found Errors

**Rebuild with no cache:**
```bash
docker build --no-cache -t ai-spare-part-analyzer .
```

**Verify requirements.txt:**
```bash
docker run --rm ai-spare-part-analyzer pip list
```

---

## 🎯 Production Simulation

Test production-like environment:

```bash
# Set production environment variables
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=your_key \
  -e GMAIL_USER=your_email \
  -e GMAIL_PASS=your_password \
  -e OTEL_SDK_DISABLED=true \
  ai-spare-part-analyzer
```

**Test with frontend:**
1. Update frontend `.env.local`: `NEXT_PUBLIC_API_URL=https://aiagent-sparefinder-org.onrender.com`
2. Start frontend: `npm run dev`
3. Test full workflow

---

## 🚀 Ready for Render!

If all tests pass, you're ready to deploy to Render.

Follow: `RENDER_DEPLOYMENT.md`

---

Generated: 2025-11-01

