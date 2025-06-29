#!/usr/bin/env python3
"""
Test the AI service with real tire image through API
"""

import requests
import json
from pathlib import Path

def test_tire_identification():
    """Test tire identification through the API"""
    
    print("🛞 Testing Tire Identification via API")
    print("=" * 50)
    
    # API configuration
    base_url = "http://localhost:8000"
    api_key = "geotech-dev-key-2024"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }
    
    # Check if AI service is running
    try:
        health_response = requests.get(f"{base_url}/health", timeout=5)
        if health_response.status_code == 200:
            print("✅ AI service is running")
        else:
            print("❌ AI service health check failed")
            return
    except Exception as e:
        print(f"❌ Cannot connect to AI service: {e}")
        print("   Make sure to run: uvicorn app.main:app --host 0.0.0.0 --port 8000")
        return
    
    # Look for test image
    test_image_paths = [
        Path("test.png"),
        Path("../test.png"),
        Path("tire_test.jpg"),
        Path("tire_test.png")
    ]
    
    test_image = None
    for path in test_image_paths:
        if path.exists():
            test_image = path
            break
    
    if not test_image:
        print("⚠️ No test image found. Creating a test request with mock data...")
        
        # Test with a simple text description
        try:
            # Test the direct part extraction
            response = requests.post(
                f"{base_url}/debug/analyze-description",
                headers=headers,
                json={"description": "black round tire with tread patterns"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Description analysis successful:")
                print(f"   Result: {json.dumps(data, indent=2)}")
            else:
                print(f"❌ Description analysis failed: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Description test failed: {e}")
        
        return
    
    print(f"📁 Found test image: {test_image}")
    
    # Test AI-only prediction first
    print("\n🤖 Testing AI-only prediction...")
    
    try:
        with open(test_image, 'rb') as f:
            files = {'file': (test_image.name, f, 'image/png')}
            params = {
                'confidence_threshold': '0.3',
                'max_predictions': '3',
                'include_web_scraping': 'false'
            }
            
            response = requests.post(
                f"{base_url}/predict",
                headers={"Authorization": f"Bearer {api_key}"},
                files=files,
                params=params,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                predictions = data.get('predictions', [])
                
                print(f"✅ AI Predictions ({len(predictions)}):")
                for i, pred in enumerate(predictions, 1):
                    print(f"   {i}. {pred.get('class_name', 'Unknown')}")
                    print(f"      Confidence: {pred.get('confidence', 0):.1%}")
                    print(f"      Category: {pred.get('category', 'Unknown')}")
                    print(f"      Description: {pred.get('description', 'N/A')[:80]}...")
                    
                    # Check if it correctly identified a tire
                    if 'tire' in pred.get('class_name', '').lower():
                        print("      ✅ CORRECTLY IDENTIFIED AS TIRE!")
                    else:
                        print(f"      ❌ Misidentified as: {pred.get('class_name', 'Unknown')}")
                    print()
                
                # Test with web scraping
                print("🌐 Testing AI + Web Scraping...")
                
                # Reset file pointer
                f.seek(0)
                params['include_web_scraping'] = 'true'
                
                response = requests.post(
                    f"{base_url}/predict",
                    headers={"Authorization": f"Bearer {api_key}"},
                    files={'file': (test_image.name, f, 'image/png')},
                    params=params,
                    timeout=60
                )
                
                if response.status_code == 200:
                    data = response.json()
                    similar_images = data.get('similar_images', [])
                    
                    print(f"✅ Similar Images Found: {len(similar_images)}")
                    if similar_images:
                        for i, img in enumerate(similar_images[:3], 1):
                            print(f"   {i}. {img.get('title', 'No title')[:50]}...")
                            print(f"      Price: {img.get('price', 'N/A')} | Source: {img.get('source', 'Unknown')}")
                            if img.get('metadata', {}).get('link'):
                                print(f"      Link: {img['metadata']['link']}")
                            print()
                else:
                    print(f"❌ AI + Web scraping failed: {response.status_code}")
                    print(f"   Response: {response.text[:200]}...")
                    
            else:
                print(f"❌ AI prediction failed: {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                
    except Exception as e:
        print(f"❌ Image test failed: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!")

if __name__ == "__main__":
    test_tire_identification() 