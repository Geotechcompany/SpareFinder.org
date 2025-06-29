#!/usr/bin/env python3
"""
Test script for AI Service with Google Vision integration
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.services.ai_service import AIService
from PIL import Image
import numpy as np
import io


async def test_ai_service():
    """Test AI Service with Google Vision."""
    print("Testing AI Service with Google Vision...")
    print("=" * 50)
    
    try:
        # Initialize AI service
        print("Initializing AI Service...")
        ai_service = AIService()
        await ai_service.load_model()
        
        print("AI Service loaded successfully!")
        
        # Create test tire image
        print("Creating test tire image...")
        test_image = Image.new('RGB', (300, 200), color='black')
        from PIL import ImageDraw
        draw = ImageDraw.Draw(test_image)
        
        # Draw a tire-like shape
        draw.ellipse([50, 50, 250, 150], fill='gray')  # Outer circle
        draw.ellipse([75, 75, 225, 125], fill='black')  # Inner circle
        draw.text((120, 90), 'TIRE', fill='white')
        
        # Convert to numpy array
        image_array = np.array(test_image)
        
        # Make prediction
        print("Making prediction...")
        predictions = await ai_service.predict(image_array, confidence_threshold=0.1)
        
        print(f"Found {len(predictions)} predictions:")
        for i, pred in enumerate(predictions):
            print(f"  {i+1}. {pred.class_name}")
            print(f"     Confidence: {pred.confidence:.1%}")
            print(f"     Category: {pred.category}")
            print(f"     Price: {pred.estimated_price}")
            print(f"     Description: {pred.description}")
            print()
        
        print("AI Service test completed successfully!")
        return True
        
    except Exception as e:
        print(f"Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Main test function."""
    success = await test_ai_service()
    
    if success:
        print("All tests passed! AI Service with Google Vision is ready.")
        sys.exit(0)
    else:
        print("Tests failed! Please check the configuration.")
        sys.exit(1)


if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    asyncio.run(main()) 