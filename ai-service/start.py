#!/usr/bin/env python3
"""
🚀 GeoTech SpareFinder Service Startup Script
🤖 Features: Hugging Face Vision AI + Multi-Site Web Scraping

This service provides:
- FREE Hugging Face Florence-2 vision AI for automotive part identification
- Multi-site web scraping from 9 automotive parts websites
- Advanced image processing and analysis
- Real-time part pricing and availability
- No API costs or quotas!
"""

import os
import sys
import asyncio
from pathlib import Path

# Add app directory to path for imports
sys.path.append(str(Path(__file__).parent / "app"))

from app.core.config import get_settings

def main():
    """Main startup function."""
    settings = get_settings()
    
    print("🚀 Starting GeoTech SpareFinder Service (Hugging Face AI + Web Scraping)...")
    print("🤖 Features: FREE Hugging Face Vision AI + Multi-Site Web Scraping")
    
    # Load environment variables
    if os.path.exists('.env'):
        print("✅ Loaded environment variables from .env file")
    else:
        print("⚠️  No .env file found, using default settings")
    
    # Display configuration
    print(f"\n🧠 Hugging Face Vision AI:")
    print(f"   Model Type: {settings.MODEL_TYPE}")
    print(f"   Device: {'CUDA' if 'cuda' in str(settings.MODEL_TYPE) else 'CPU'}")
    print(f"   Cache Path: {settings.MODEL_PATH}")
    print(f"   Supported: Florence-2 Vision, FREE Image Analysis")
    
    print(f"\n🕷️  Web Scraping:")
    print(f"   Enabled: {'✅ Yes' if settings.is_web_scraping_enabled else '❌ No'}")
    if settings.is_web_scraping_enabled:
        print(f"   Max Sites: {settings.MAX_SCRAPING_SITES}")
        print(f"   Supported Sites: 9 sites")
        supported_sites = [
            "eBay Motors", "AliExpress Auto Parts", "RockAuto", "CarID.com",
            "PartsGeek", "Summit Racing", "JEGS", "FCPEuro.com", "BuyAutoParts.com"
        ]
        for site in supported_sites:
            print(f"     • {site}")
    
    # Additional configuration
    additional_apis = []
    if settings.GOOGLE_API_KEY:
        additional_apis.append("Google Search")
    if settings.SUPABASE_URL:
        additional_apis.append("Supabase")
    
    print(f"\n🔌 Additional API Configuration:")
    if additional_apis:
        print(f"✅ Configured: {', '.join(additional_apis)}")
    else:
        print("⚠️  No additional APIs configured")
    
    print(f"\n📊 Total configured features: {len([x for x in [settings.is_web_scraping_enabled, bool(additional_apis)] if x]) + 1}")
    
    # Server configuration
    print(f"\n🌐 Server Configuration:")
    print(f"   Host: {settings.HOST}")
    print(f"   Port: {settings.PORT}")
    print(f"   Environment: {settings.ENVIRONMENT}")
    print(f"   Debug: {settings.DEBUG}")
    
    # Security configuration
    print(f"\n🔐 Security:")
    print(f"   API Key: ✅ Configured")
    print(f"   CORS Origins: {'All Origins (*)' if settings.ALLOWED_ORIGINS == '*' else 'Restricted'}")
    
    # Web scraping details
    if settings.is_web_scraping_enabled:
        print(f"\n🕷️  Web Scraping:")
        print(f"   Enabled: ✅ Yes")
        print(f"   Max Sites per Search: {settings.MAX_SCRAPING_SITES}")
        print(f"   Delay Between Requests: {getattr(settings, 'SCRAPING_DELAY', 2.0)}s")
        print(f"   Chrome/Selenium: ✅ Ready for JS-heavy sites")
    
    # Processing limits
    print(f"\n📊 Processing Limits:")
    print(f"   Max File Size: {settings.MAX_FILE_SIZE_MB}MB")
    print(f"   Batch Size Limit: {settings.BATCH_SIZE_LIMIT}")
    print(f"   Confidence Threshold: {settings.DEFAULT_CONFIDENCE_THRESHOLD}")
    
    print("=" * 70)
    print("🎯 Available Endpoints:")
    endpoints = [
        ("📋 Health", "http://localhost:8000/health"),
        ("📚 API Docs", "http://localhost:8000/docs"),
        ("🤖 HF Predict", "http://localhost:8000/predict"),
        ("🔍 Enhanced Predict", "http://localhost:8000/predict/image"),
        ("🕷️  Web Scraping", "http://localhost:8000/parts/search/scrape"),
        ("📦 Batch Predict", "http://localhost:8000/predict/batch"),
        ("⚙️  Scraping Config", "http://localhost:8000/scraping/config"),
        ("🖼️  Download Image", "http://localhost:8000/images/download"),
        ("📸 Batch Images", "http://localhost:8000/images/batch-download"),
        ("✅ Validate Image", "http://localhost:8000/images/validate"),
        ("🔌 Providers", "http://localhost:8000/providers")
    ]
    
    for name, url in endpoints:
        print(f"   {name}: {url}")
    print("=" * 70)
    
    print("\n🌟 Key Features:")
    features = [
        "• FREE Hugging Face Florence-2 for accurate part identification",
        "• Multi-site web scraping for real market data",
        "• Advanced image fetching and processing",
        "• Price comparison across automotive websites",
        "• Enhanced part descriptions and specifications",
        "• Compatibility information and part numbers",
        "• Batch image downloading with validation",
        "• Base64 encoding support for images",
        "• No API costs or usage quotas",
        "• Prometheus metrics and health monitoring"
    ]
    
    for feature in features:
        print(f"   {feature}")
    
    # Start the server
    print(f"\n🚀 Starting server...")
    os.system(f"uvicorn app.main:app --host {settings.HOST} --port {settings.PORT} --reload")

if __name__ == "__main__":
    main() 