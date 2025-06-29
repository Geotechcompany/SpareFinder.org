#!/usr/bin/env python3
"""
Test script to verify Hugging Face + Web Scraper integration
"""

import asyncio
import sys
import os
import requests
import json
from pathlib import Path

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

async def test_ai_service_integration():
    """Test the AI service with web scraper integration"""
    print("🧪 Testing AI Service + Web Scraper Integration")
    print("=" * 60)
    
    # Test endpoints
    base_url = "http://localhost:8000"
    api_key = "geotech-dev-key-2024"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }
    
    # Test 1: Health check
    print("\n1️⃣ Testing Health Check...")
    try:
        response = requests.get(f"{base_url}/health", headers=headers, timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Health check passed: {health_data.get('status', 'unknown')}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False
    
    # Test 2: Scraping configuration
    print("\n2️⃣ Testing Scraping Configuration...")
    try:
        response = requests.get(f"{base_url}/scraping/config", headers=headers, timeout=10)
        if response.status_code == 200:
            config_data = response.json()
            print(f"✅ Scraping config loaded:")
            print(f"   - Web scraping enabled: {config_data.get('web_scraping_enabled', False)}")
            print(f"   - Available sites: {len(config_data.get('available_sites', []))}")
            print(f"   - Primary site: {config_data.get('available_sites', ['None'])[0] if config_data.get('available_sites') else 'None'}")
        else:
            print(f"❌ Scraping config failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Scraping config error: {e}")
    
    # Test 3: Direct web scraping test
    print("\n3️⃣ Testing Direct Web Scraping...")
    try:
        test_part = "brake pads"
        response = requests.post(
            f"{base_url}/parts/search/scrape",
            headers=headers,
            params={"part_name": test_part, "max_sites": 1},
            timeout=30
        )
        if response.status_code == 200:
            scrape_data = response.json()
            results_count = scrape_data.get('total_results', 0)
            processing_time = scrape_data.get('processing_time', 0)
            print(f"✅ Web scraping successful:")
            print(f"   - Part searched: {test_part}")
            print(f"   - Results found: {results_count}")
            print(f"   - Processing time: {processing_time:.2f}s")
            
            if results_count > 0:
                first_result = scrape_data.get('results', [{}])[0]
                print(f"   - First result: {first_result.get('title', 'No title')[:50]}...")
                print(f"   - Price: {first_result.get('price', 'N/A')}")
                print(f"   - Source: {first_result.get('source', 'Unknown')}")
        else:
            print(f"❌ Web scraping failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
    except Exception as e:
        print(f"❌ Web scraping error: {e}")
    
    # Test 4: Test with a sample image (if available)
    print("\n4️⃣ Testing AI + Web Scraper Integration...")
    
    # Check if test image exists
    test_image_path = Path("test.png")
    if not test_image_path.exists():
        test_image_path = Path("../test.png")
    
    if test_image_path.exists():
        try:
            with open(test_image_path, 'rb') as f:
                files = {'file': ('test.png', f, 'image/png')}
                params = {
                    'confidence_threshold': '0.5',
                    'max_predictions': '3',
                    'include_web_scraping': 'true'
                }
                
                print(f"   📸 Using test image: {test_image_path}")
                response = requests.post(
                    f"{base_url}/predict",
                    headers={"Authorization": f"Bearer {api_key}"},
                    files=files,
                    params=params,
                    timeout=60
                )
                
                if response.status_code == 200:
                    predict_data = response.json()
                    predictions = predict_data.get('predictions', [])
                    similar_images = predict_data.get('similar_images', [])
                    processing_time = predict_data.get('processing_time', 0)
                    
                    print(f"✅ AI + Web Scraper integration successful:")
                    print(f"   - Predictions found: {len(predictions)}")
                    print(f"   - Similar images found: {len(similar_images)}")
                    print(f"   - Processing time: {processing_time:.2f}s")
                    print(f"   - Model used: {predict_data.get('model_version', 'Unknown')}")
                    print(f"   - Web scraping used: {predict_data.get('image_metadata', {}).get('web_scraping_used', False)}")
                    
                    if predictions:
                        best_prediction = predictions[0]
                        print(f"\n   🎯 Best Prediction:")
                        print(f"     - Part: {best_prediction.get('class_name', 'Unknown')}")
                        print(f"     - Confidence: {best_prediction.get('confidence', 0):.1%}")
                        print(f"     - Category: {best_prediction.get('category', 'Unknown')}")
                        print(f"     - Manufacturer: {best_prediction.get('manufacturer', 'Unknown')}")
                        print(f"     - Price estimate: {best_prediction.get('estimated_price', 'N/A')}")
                    
                    if similar_images:
                        print(f"\n   🖼️  Similar Images Sample:")
                        for i, img in enumerate(similar_images[:3]):
                            print(f"     {i+1}. {img.get('title', 'No title')[:40]}...")
                            print(f"        Price: {img.get('price', 'N/A')} | Source: {img.get('source', 'Unknown')}")
                            print(f"        Similarity: {img.get('similarity_score', 0):.1%}")
                else:
                    print(f"❌ AI prediction failed: {response.status_code}")
                    print(f"   Response: {response.text[:300]}...")
        except Exception as e:
            print(f"❌ AI prediction error: {e}")
    else:
        print("   ⚠️  No test image found - skipping image prediction test")
        print("   💡 Place a test image at 'test.png' or '../test.png' to test image prediction")
    
    print("\n" + "=" * 60)
    print("🏁 Integration test completed!")
    print("\nNext steps:")
    print("1. If all tests passed ✅, the integration is working correctly")
    print("2. If any tests failed ❌, check the error messages above")
    print("3. For image testing, ensure you have a test image file")
    print("4. The system is now ready to receive requests from the frontend")

if __name__ == "__main__":
    asyncio.run(test_ai_service_integration()) 