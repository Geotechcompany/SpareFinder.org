#!/usr/bin/env python3
"""
Test script for Google Vision API integration
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.services.google_vision_service import GoogleVisionService
from PIL import Image
import io


async def test_google_vision():
    """Test Google Vision API service."""
    print("🚀 Testing Google Vision API Integration")
    print("=" * 50)
    
    try:
        # Check if API key is configured
        api_key = os.getenv('GOOGLE_VISION_API_KEY')
        if not api_key:
            print("❌ GOOGLE_VISION_API_KEY not found in environment")
            return False
        
        print(f"✅ API Key configured: {api_key[:20]}...")
        
        # Initialize Google Vision service
        print("\n📡 Initializing Google Vision service...")
        vision_service = GoogleVisionService()
        
        # Test connection
        print("🔗 Testing API connection...")
        connection_test = await vision_service.test_connection()
        
        if connection_test:
            print("✅ Google Vision API connection successful!")
        else:
            print("❌ Google Vision API connection failed!")
            return False
        
        # Test with a sample automotive image (create a simple test image)
        print("\n🖼️ Creating test automotive image...")
        test_image = Image.new('RGB', (300, 200), color='gray')
        
        # Add some text to make it look like a car part
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(test_image)
        
        try:
            # Try to use a default font
            font = ImageFont.load_default()
        except:
            font = None
        
        # Draw some automotive-related text
        draw.text((50, 50), "BRAKE PAD", fill='white', font=font)
        draw.text((50, 80), "OEM PART", fill='white', font=font)
        draw.text((50, 110), "BP-12345", fill='white', font=font)
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        test_image.save(img_byte_arr, format='PNG')
        image_bytes = img_byte_arr.getvalue()
        
        print("🔍 Analyzing test image with Google Vision...")
        analysis_result = await vision_service.analyze_automotive_part(image_bytes)
        
        print("\n📊 Analysis Results:")
        print(f"  Part Name: {analysis_result['part_name']}")
        print(f"  Category: {analysis_result['category']}")
        print(f"  Confidence: {analysis_result['confidence']:.1f}%")
        print(f"  Price Range: {analysis_result['price_range']}")
        print(f"  Description: {analysis_result['description']}")
        
        print("\n✅ Google Vision integration test completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Main test function."""
    success = await test_google_vision()
    
    if success:
        print("\n🎉 All tests passed! Google Vision is ready to use.")
        sys.exit(0)
    else:
        print("\n💥 Tests failed! Please check the configuration.")
        sys.exit(1)


if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    asyncio.run(main()) 