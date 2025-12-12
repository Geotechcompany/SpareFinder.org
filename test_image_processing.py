import os
import cv2
import json
import requests
import base64

# You.com API configuration
YOU_API_KEY = '90dd8e00-2a80-4d0a-a25b-7a71ab474f52'  # Primary API key
YOU_API_URL = 'https://chat-api.you.com/smart'

def preprocess_image(image_path):
    """
    Preprocess image for API upload.
    
    Args:
        image_path (str): Path to the image file
    
    Returns:
        str: Base64 encoded image
    """
    # Read image
    image = cv2.imread(image_path)
    
    # Resize image if too large
    max_size = 1024
    height, width = image.shape[:2]
    if max(height, width) > max_size:
        scale = max_size / max(height, width)
        new_size = (int(width * scale), int(height * scale))
        image = cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)
    
    # Convert to JPEG
    _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 85])
    
    # Encode to base64
    return base64.b64encode(buffer).decode('utf-8')

def analyze_image(image_path):
    """
    Analyze an image using You.com API with comprehensive prompting.
    
    Args:
        image_path (str): Path to the image file
    
    Returns:
        Dict: Detailed image analysis results
    """
    # Preprocess image
    image_base64 = preprocess_image(image_path)

    # Prepare API request
    headers = {
        'Authorization': f'Bearer {YOU_API_KEY}',
        'Content-Type': 'application/json'
    }

    # Comprehensive prompt for detailed analysis
    prompt = """
    Perform a comprehensive technical analysis of this Manufacturing part image. 
    Provide a detailed breakdown including:
    1. Specific component identification
    2. Detailed description of component parts
    3. Potential manufacturers
    4. Approximate price range
    5. Technical specifications
    6. Potential applications or vehicle types
    
    Be as specific and technical as possible, using engineering terminology.
    """

    payload = {
        'query': prompt,
        'image': image_base64,
        'chat_history': [],
        'include_links': False,
        'stream': False
    }

    # Make API request
    try:
        print(f"API Request URL: {YOU_API_URL}")
        print(f"API Key: {YOU_API_KEY}")
        print(f"Headers: {headers}")
        
        response = requests.post(
            YOU_API_URL, 
            headers=headers, 
            json=payload, 
            timeout=60
        )

        # Print full response details
        print(f"Response Status Code: {response.status_code}")
        print(f"Response Headers: {response.headers}")
        print(f"Response Content: {response.text}")

        # Check for successful response
        response.raise_for_status()

        # Parse and return response
        result = response.json()
        return {
            'response': result.get('response', 'No response'),
            'success': True
        }

    except requests.RequestException as e:
        print(f"API request failed: {e}")
        return {
            'error': str(e),
            'success': False
        }

def main():
    # Path to the test image
    test_image_path = 'download (10).jpeg'  # Specific image path
    
    # Analyze image
    result = analyze_image(test_image_path)
    
    # Print results
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main() 