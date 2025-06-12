#!/bin/bash

# GeoTech PartFinder AI - API Keys Setup Script
echo "🔑 GeoTech PartFinder AI - API Keys Setup"
echo "=========================================="

# Get API keys from user
echo "Enter your API keys (press Enter to skip):"
echo ""

read -p "Google API Key: " GOOGLE_API_KEY
read -p "Google Search Engine ID: " GOOGLE_SEARCH_ENGINE_ID
read -p "Nexar/Octopart API Key: " OCTOPART_API_KEY
read -p "Supabase URL: " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY

echo ""
echo "📝 Updating environment files..."

# Update frontend .env.local
if [ -f ".env.local" ]; then
    if [ ! -z "$SUPABASE_URL" ]; then
        sed -i "s|VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=$SUPABASE_URL|" .env.local
    fi
    if [ ! -z "$SUPABASE_ANON_KEY" ]; then
        sed -i "s|VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" .env.local
    fi
    echo "✅ Updated frontend .env.local"
else
    echo "❌ Frontend .env.local not found"
fi

# Update AI service .env
if [ -f "ai-service/.env" ]; then
    if [ ! -z "$GOOGLE_API_KEY" ]; then
        sed -i "s|GOOGLE_API_KEY=.*|GOOGLE_API_KEY=$GOOGLE_API_KEY|" ai-service/.env
    fi
    if [ ! -z "$GOOGLE_SEARCH_ENGINE_ID" ]; then
        sed -i "s|GOOGLE_SEARCH_ENGINE_ID=.*|GOOGLE_SEARCH_ENGINE_ID=$GOOGLE_SEARCH_ENGINE_ID|" ai-service/.env
    fi
    if [ ! -z "$OCTOPART_API_KEY" ]; then
        sed -i "s|OCTOPART_API_KEY=.*|OCTOPART_API_KEY=$OCTOPART_API_KEY|" ai-service/.env
    fi
    if [ ! -z "$SUPABASE_URL" ]; then
        sed -i "s|SUPABASE_URL=.*|SUPABASE_URL=$SUPABASE_URL|" ai-service/.env
    fi
    if [ ! -z "$SUPABASE_ANON_KEY" ]; then
        sed -i "s|SUPABASE_KEY=.*|SUPABASE_KEY=$SUPABASE_ANON_KEY|" ai-service/.env
    fi
    echo "✅ Updated AI service .env"
else
    echo "❌ AI service .env not found"
fi

echo ""
echo "🎉 API keys setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Restart the AI service: cd ai-service && python start.py"
echo "   2. Restart the frontend: npm run dev"
echo "   3. Test image upload with enhanced external search"
echo ""
echo "💡 Tips:"
echo "   • Google Search gives you 100 free searches per day"
echo "   • Nexar/Octopart gives you 1,000 free API calls per month"
echo "   • Supabase gives you 500MB free database storage" 