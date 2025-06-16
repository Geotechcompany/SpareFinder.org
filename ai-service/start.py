#!/usr/bin/env python3
"""
GeoTech SpareFinder Service Startup Script
Starts the FastAPI server with simplified configuration
(TensorFlow AI + Google Search only)
"""

import os
import sys
import logging
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def setup_environment():
    """Setup environment variables and validate configuration."""
    
    # Check for .env file
    env_file = Path(__file__).parent / ".env"
    if not env_file.exists():
        print("⚠️  Warning: .env file not found!")
        print("📋 Please copy env.example to .env and configure your API keys")
        print("🔗 See README for setup instructions")
        
        # Check if we have basic required vars
        required_vars = ["API_KEY"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
            print("🚫 Cannot start service without basic configuration")
            sys.exit(1)
    
    # Log external API configuration status
    external_apis = {
        "Google Search": "GOOGLE_API_KEY"
    }
    
    configured_apis = []
    for name, env_var in external_apis.items():
        if os.getenv(env_var):
            configured_apis.append(name)
    
    print("\n🔌 External API Configuration Status:")
    if configured_apis:
        print(f"✅ Configured: {', '.join(configured_apis)}")
    else:
        print("⚠️  No external APIs configured")
        print("📝 Part search will work with TensorFlow AI only")
    
    remaining_apis = [name for name, env_var in external_apis.items() if not os.getenv(env_var)]
    if remaining_apis:
        print(f"❌ Not configured: {', '.join(remaining_apis)}")
    
    print(f"\n📊 Total configured providers: {len(configured_apis)}/1")

def main():
    """Main startup function."""
    
    print("🚀 Starting GeoTech SpareFinder Service (Simplified)...")
    print("🤖 Features: TensorFlow AI + Google Search")
    
    # Setup environment
    setup_environment()
    
    # Import after environment setup
    try:
        from app.core.config import get_settings
        import uvicorn
        
        settings = get_settings()
        
        print(f"\n🌐 Server Configuration:")
        print(f"   Host: {settings.HOST}")
        print(f"   Port: {settings.PORT}")
        print(f"   Environment: {settings.ENVIRONMENT}")
        print(f"   Debug: {settings.DEBUG}")
        
        print(f"\n🔐 Security:")
        print(f"   API Key: {'✅ Configured' if settings.API_KEY else '❌ Missing'}")
        print(f"   CORS Origins: {', '.join(settings.ALLOWED_ORIGINS)}")
        
        print(f"\n🧠 TensorFlow AI Model:")
        print(f"   Type: {settings.MODEL_TYPE}")
        print(f"   Path: {settings.MODEL_PATH}")
        print(f"   Supported: MobileNetV2, EfficientNet, Custom")
        
        print("\n" + "="*60)
        print("🎯 Available Endpoints:")
        print("   📋 Health: http://localhost:8000/health")
        print("   📚 Docs: http://localhost:8000/docs")
        print("   🤖 AI Predict: http://localhost:8000/predict/image")
        print("   🔌 Providers: http://localhost:8000/providers")
        print("="*60)
        
        # Start the server
        uvicorn.run(
            "app.main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.DEBUG,
            log_level=settings.LOG_LEVEL.lower(),
            access_log=True
        )
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("📦 Please install dependencies: pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Startup error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 