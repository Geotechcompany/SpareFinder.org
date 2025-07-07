import asyncio
import cv2
import json
from app.services.you_image_service import you_image_service

async def test_image_processing(image_path):
    """
    Test image processing with You.com API.
    
    Args:
        image_path (str): Path to the image file
    """
    # Read image
    image = cv2.imread(image_path)
    
    if image is None:
        print(f"Failed to read image from {image_path}")
        return
    
    # Convert image to bytes
    _, image_bytes = cv2.imencode('.jpg', image)
    
    try:
        # Analyze image
        result = await you_image_service.analyze_image(image_bytes.tobytes())
        
        # Pretty print the result
        print("Image Analysis Results:")
        print(json.dumps(result, indent=2))
    
    except Exception as e:
        print(f"Image analysis failed: {e}")

def main():
    # Path to the test image
    test_image_path = '../test.png'  # Adjust path as needed
    
    # Run async function
    asyncio.run(test_image_processing(test_image_path))

if __name__ == '__main__':
    main() 