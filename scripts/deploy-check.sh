#!/bin/bash

echo "🚀 SpareFinder AI - Render Deployment Check"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

echo -e "\n${BLUE}📋 Checking Prerequisites...${NC}"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

# Check Docker
if command_exists docker; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✅ Docker: $DOCKER_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Docker not found (optional for local testing)${NC}"
fi

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ Python: $PYTHON_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Python3 not found (needed for AI service)${NC}"
fi

echo -e "\n${BLUE}🔧 Checking Backend...${NC}"

# Check backend directory
if [ -d "backend" ]; then
    echo -e "${GREEN}✅ Backend directory exists${NC}"
    
    # Check package.json
    if [ -f "backend/package.json" ]; then
        echo -e "${GREEN}✅ Backend package.json exists${NC}"
    else
        echo -e "${RED}❌ Backend package.json missing${NC}"
        exit 1
    fi
    
    # Check TypeScript config
    if [ -f "backend/tsconfig.json" ]; then
        echo -e "${GREEN}✅ Backend tsconfig.json exists${NC}"
    else
        echo -e "${RED}❌ Backend tsconfig.json missing${NC}"
        exit 1
    fi
    
    # Test backend build
    echo -e "${YELLOW}🔨 Testing backend build...${NC}"
    cd backend
    if npm install --silent && npm run build --silent; then
        echo -e "${GREEN}✅ Backend builds successfully${NC}"
    else
        echo -e "${RED}❌ Backend build failed${NC}"
        cd ..
        exit 1
    fi
    cd ..
else
    echo -e "${RED}❌ Backend directory not found${NC}"
    exit 1
fi

echo -e "\n${BLUE}🤖 Checking AI Service...${NC}"

# Check AI service directory
if [ -d "ai-service" ]; then
    echo -e "${GREEN}✅ AI service directory exists${NC}"
    
    # Check Dockerfile
    if [ -f "ai-service/Dockerfile" ]; then
        echo -e "${GREEN}✅ AI service Dockerfile exists${NC}"
    else
        echo -e "${RED}❌ AI service Dockerfile missing${NC}"
        exit 1
    fi
    
    # Check requirements.txt
    if [ -f "ai-service/requirements.txt" ]; then
        echo -e "${GREEN}✅ AI service requirements.txt exists${NC}"
    else
        echo -e "${RED}❌ AI service requirements.txt missing${NC}"
        exit 1
    fi
    
    # Check start.py
    if [ -f "ai-service/start.py" ]; then
        echo -e "${GREEN}✅ AI service start.py exists${NC}"
    else
        echo -e "${RED}❌ AI service start.py missing${NC}"
        exit 1
    fi
    
    # Test Docker build (if Docker is available)
    if command_exists docker; then
        echo -e "${YELLOW}🐳 Testing AI service Docker build...${NC}"
        cd ai-service
        if docker build -t sparefinder-ai-test . --quiet; then
            echo -e "${GREEN}✅ AI service Docker builds successfully${NC}"
            docker rmi sparefinder-ai-test --force >/dev/null 2>&1
        else
            echo -e "${RED}❌ AI service Docker build failed${NC}"
            cd ..
            exit 1
        fi
        cd ..
    fi
else
    echo -e "${RED}❌ AI service directory not found${NC}"
    exit 1
fi

echo -e "\n${BLUE}📁 Checking Configuration Files...${NC}"

# Check render.yaml
if [ -f "render.yaml" ]; then
    echo -e "${GREEN}✅ render.yaml exists${NC}"
else
    echo -e "${YELLOW}⚠️  render.yaml not found (optional)${NC}"
fi

# Check environment files
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✅ .env.example exists${NC}"
else
    echo -e "${YELLOW}⚠️  .env.example not found${NC}"
fi

if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✅ Backend .env exists${NC}"
else
    echo -e "${YELLOW}⚠️  Backend .env not found (needed for local testing)${NC}"
fi

if [ -f "ai-service/.env" ]; then
    echo -e "${GREEN}✅ AI service .env exists${NC}"
else
    echo -e "${YELLOW}⚠️  AI service .env not found (needed for local testing)${NC}"
fi

echo -e "\n${BLUE}📋 Environment Variables Checklist:${NC}"
echo -e "${YELLOW}Backend Environment Variables:${NC}"
echo "  - NODE_ENV=production"
echo "  - PORT=10000"
echo "  - SUPABASE_URL=your_supabase_url"
echo "  - SUPABASE_SERVICE_KEY=your_service_key"
echo "  - JWT_SECRET=your_jwt_secret"
echo "  - FRONTEND_URL=your_netlify_url"
echo "  - AI_SERVICE_URL=https://sparefinder-ai-service.onrender.com"
echo "  - ALLOWED_ORIGINS=your_netlify_url"

echo -e "\n${YELLOW}AI Service Environment Variables:${NC}"
echo "  - PORT=10000"
echo "  - SUPABASE_URL=your_supabase_url"
echo "  - SUPABASE_SERVICE_KEY=your_service_key"
echo "  - API_KEY=your_ai_api_key"
echo "  - GOOGLE_API_KEY=your_google_api_key"
echo "  - GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id"
echo "  - PYTHONUNBUFFERED=1"
echo "  - ENVIRONMENT=production"

echo -e "\n${GREEN}🎉 Deployment Check Complete!${NC}"
echo -e "${BLUE}📖 Next Steps:${NC}"
echo "1. Follow the DEPLOYMENT_GUIDE.md"
echo "2. Deploy backend to Render first"
echo "3. Deploy AI service to Render second"
echo "4. Update frontend environment variables"
echo "5. Test the complete application"

echo -e "\n${YELLOW}💡 Tips:${NC}"
echo "- Use Render's free tier for testing"
echo "- Monitor logs during deployment"
echo "- Test health endpoints after deployment"
echo "- Set up UptimeRobot to keep services warm" 