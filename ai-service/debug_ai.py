#!/usr/bin/env python3
"""
Enhanced AI Service Debug Script
Tests the improved automotive part identification system
"""

import asyncio
import sys
import os
from pathlib import Path
import numpy as np
from PIL import Image
import logging

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.services.ai_service import AIService
from app.core.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_ai_identification():
    """Test the enhanced AI identification system."""
    
    print("🤖 Enhanced AI Service Debug Test")
    print("=" * 50)
    
    # Initialize AI service
    ai_service = AIService()
    
    try:
        print("📥 Loading Hugging Face BLIP model...")
        await ai_service.load_model()
        print("✅ Model loaded successfully!")
        
        # Test different scenarios
        test_scenarios = [
            {
                'name': 'Tire Test',
                'description': 'a black rubber tire with tread patterns, round circular shape, automotive wheel tire',
                'expected': 'tire'
            },
            {
                'name': 'Brake Pad Test',
                'description': 'rectangular metal brake pad with friction material, flat square brake component',
                'expected': 'brake pads'
            },
            {
                'name': 'Air Filter Test',
                'description': 'rectangular white pleated paper air filter, accordion style engine filter',
                'expected': 'air filter'
            },
            {
                'name': 'Headlight Test',
                'description': 'clear transparent headlight lens with reflector, automotive front light assembly',
                'expected': 'headlight'
            },
            {
                'name': 'Battery Test',
                'description': 'rectangular black car battery with terminal posts, automotive lead acid battery',
                'expected': 'battery'
            }
        ]
        
        print(f"\n🧪 Testing {len(test_scenarios)} scenarios...")
        print("-" * 50)
        
        for i, scenario in enumerate(test_scenarios, 1):
            print(f"\n📋 Test {i}: {scenario['name']}")
            print(f"🔍 Input Description: {scenario['description']}")
            print(f"🎯 Expected Result: {scenario['expected']}")
            
            try:
                # Test the part extraction directly
                parts = await ai_service._extract_automotive_parts(scenario['description'])
                
                if parts:
                    identified_part = parts[0]['name'].lower()
                    confidence = parts[0]['confidence_score']
                    category = parts[0]['category']
                    
                    print(f"🤖 AI Identified: {parts[0]['name']}")
                    print(f"📊 Confidence: {confidence:.2f}")
                    print(f"📂 Category: {category}")
                    
                    # Check if identification is correct
                    if scenario['expected'].lower() in identified_part:
                        print("✅ CORRECT IDENTIFICATION!")
                    else:
                        print("❌ INCORRECT IDENTIFICATION!")
                        print(f"   Expected: {scenario['expected']}")
                        print(f"   Got: {identified_part}")
                    
                    # Show all parts found
                    if len(parts) > 1:
                        print(f"🔄 Alternative matches:")
                        for j, part in enumerate(parts[1:], 2):
                            print(f"   {j}. {part['name']} (confidence: {part['confidence_score']:.2f})")
                else:
                    print("❌ NO PARTS IDENTIFIED!")
                
            except Exception as e:
                print(f"💥 Error in test {i}: {str(e)}")
            
            print("-" * 30)
        
        # Test with actual image if available
        print(f"\n🖼️ Testing with actual image...")
        test_image_path = Path(__file__).parent / "test.png"
        
        if test_image_path.exists():
            print(f"📁 Found test image: {test_image_path}")
            
            try:
                # Load and process the image
                pil_image = Image.open(test_image_path)
                image_array = np.array(pil_image)
                
                print(f"🖼️ Image shape: {image_array.shape}")
                print(f"📏 Image size: {pil_image.size}")
                
                # Make prediction
                print("🔄 Running AI analysis...")
                predictions = await ai_service.predict(
                    image_array,
                    confidence_threshold=0.3,
                    max_predictions=3
                )
                
                if predictions:
                    print(f"✅ Found {len(predictions)} predictions:")
                    for i, pred in enumerate(predictions, 1):
                        print(f"   {i}. {pred.class_name}")
                        print(f"      Confidence: {pred.confidence:.2f}")
                        print(f"      Category: {pred.category}")
                        print(f"      Description: {pred.description}")
                        if pred.estimated_price:
                            print(f"      Price: {pred.estimated_price}")
                        print()
                else:
                    print("❌ No predictions found!")
                
            except Exception as e:
                print(f"💥 Error processing image: {str(e)}")
        else:
            print(f"⚠️ No test image found at {test_image_path}")
            print("   Place a tire image as 'test.png' to test with real image")
        
        # Test web scraping integration
        print(f"\n🌐 Testing Web Scraping Integration...")
        
        if ai_service.web_scraper_available:
            print("✅ Web scraper is available")
            
            # Create a dummy tire image for testing
            dummy_image = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
            
            try:
                predictions, similar_images = await ai_service.predict_with_web_scraping(
                    dummy_image,
                    confidence_threshold=0.3,
                    max_predictions=2,
                    include_scraping=True
                )
                
                print(f"🤖 Predictions: {len(predictions)}")
                if predictions:
                    for pred in predictions:
                        print(f"   - {pred.class_name} ({pred.confidence:.2f})")
                
                print(f"🖼️ Similar Images: {len(similar_images)}")
                if similar_images:
                    for img in similar_images[:3]:
                        print(f"   - {img['title'][:50]}... ({img['price']})")
                
            except Exception as e:
                print(f"💥 Web scraping test failed: {str(e)}")
        else:
            print("❌ Web scraper not available")
        
    except Exception as e:
        print(f"💥 Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        try:
            await ai_service.cleanup()
            print("\n🧹 Cleanup completed")
        except Exception as e:
            print(f"⚠️ Cleanup error: {str(e)}")

async def test_specific_tire_descriptions():
    """Test specific tire-related descriptions that might be misidentified."""
    
    print("\n🛞 Specific Tire Identification Tests")
    print("=" * 50)
    
    ai_service = AIService()
    await ai_service.load_model()
    
    tire_descriptions = [
        "a black round tire with deep tread patterns",
        "circular rubber tire with sidewall markings",
        "automotive wheel tire with radial tread design",
        "black rubber tyre with distinctive tread pattern",
        "round tire showing tread wear patterns",
        "car tire with visible sidewall and tread",
        "pneumatic tire with all-season tread design"
    ]
    
    print(f"Testing {len(tire_descriptions)} tire descriptions...")
    
    correct_identifications = 0
    
    for i, description in enumerate(tire_descriptions, 1):
        print(f"\n🧪 Test {i}: {description}")
        
        parts = await ai_service._extract_automotive_parts(description)
        
        if parts:
            identified = parts[0]['name'].lower()
            confidence = parts[0]['confidence_score']
            
            if 'tire' in identified:
                print(f"✅ CORRECT: {parts[0]['name']} (confidence: {confidence:.2f})")
                correct_identifications += 1
            else:
                print(f"❌ WRONG: {parts[0]['name']} (confidence: {confidence:.2f})")
                print(f"   Should be: Tire")
        else:
            print("❌ NO IDENTIFICATION")
    
    accuracy = (correct_identifications / len(tire_descriptions)) * 100
    print(f"\n📊 Tire Identification Accuracy: {accuracy:.1f}% ({correct_identifications}/{len(tire_descriptions)})")
    
    await ai_service.cleanup()

if __name__ == "__main__":
    print("🚀 Starting Enhanced AI Service Debug Tests...")
    
    # Run the main test
    asyncio.run(test_ai_identification())
    
    # Run specific tire tests
    asyncio.run(test_specific_tire_descriptions())
    
    print("\n🏁 All tests completed!") 