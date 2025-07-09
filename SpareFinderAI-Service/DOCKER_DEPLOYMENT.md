# SpareFinderAI Service - Docker and Render Deployment Guide

## Prerequisites
- Docker installed
- Render account
- OpenAI API Key

## Local Docker Deployment

### Build Docker Image
```bash
docker build -t sparefinder-ai-service .
```

### Run Docker Container
```bash
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=your_openai_api_key \
  -e ENVIRONMENT=production \
  sparefinder-ai-service
```

## Render Deployment Steps

1. **Create a New Web Service**
   - Choose "Docker" as the runtime
   - Connect your GitHub repository
   - Set the root directory to `SpareFinderAI-Service`

2. **Environment Variables**
   - Add `OPENAI_API_KEY` as a secret
   - Set `ENVIRONMENT` to `production`

3. **Build Configuration**
   - Docker Build Command: `docker build -t sparefinder-ai-service .`
   - Docker Run Command: `uvicorn main:app --host 0.0.0.0 --port ${PORT}`

## Troubleshooting
- Ensure all dependencies are in `requirements.txt`
- Check Docker logs for any startup issues
- Verify OpenAI API key permissions

## Performance Optimization
- Use a paid Render plan for better performance
- Consider using GPU-enabled instances for ML models

## Security Notes
- Never commit sensitive keys to version control
- Use Render's secret management for API keys 