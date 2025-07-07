import os
import sys
import uuid
import requests
import json

# Print ALL environment variables
print("ALL ENVIRONMENT VARIABLES:")
for key, value in os.environ.items():
    if 'API' in key or 'KEY' in key or 'YOU' in key:
        print(f"{key}: {repr(value)}")

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Get API keys from environment
API_KEYS = [
    os.getenv('YOU_API_KEY', '').split('<__>')[0].strip(),
    os.getenv('YOU_API_KEY', '').split('<>')[0].strip()
]

# Remove empty keys
API_KEYS = [key for key in API_KEYS if key]

print("\nTrying API Keys:")
for key in API_KEYS:
    print(f"- {key[:10]}...")

# Smart API endpoint
url = "https://chat-api.you.com/smart"

# Prepare payload following the documentation
payload = {
    "query": "automotive parts identification technologies",
    "chat_id": str(uuid.uuid4()),  # Generate a unique chat ID
    "instructions": "Provide a comprehensive overview of modern technologies used in automotive part identification. Focus on technical details, emerging technologies, and practical applications."
}

# Try each API key
for YOU_API_KEY in API_KEYS:
    print(f"\n--- Trying API Key: {YOU_API_KEY[:10]}... ---")
    
    # Prepare headers
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": YOU_API_KEY
    }

    # Debug: Print out payload and headers
    print("\nPayload:")
    print(json.dumps(payload, indent=2))
    print("\nHeaders:")
    print(json.dumps(headers, indent=2))

    try:
        # Make the API request
        response = requests.post(url, json=payload, headers=headers)
        
        # Print detailed response information
        print("\n--- Response Details ---")
        print("Response Status Code:", response.status_code)
        
        print("\nResponse Headers:")
        for key, value in response.headers.items():
            print(f"{key}: {value}")
        
        # Try to parse and print JSON response
        try:
            response_json = response.json()
            print("\nResponse JSON:")
            print(json.dumps(response_json, indent=2))
            
            # If successful, exit the script
            sys.exit(0)
        
        except ValueError:
            print("\n--- Failed to parse JSON response ---")
            print("Response Text:", response.text)
        
    except requests.RequestException as e:
        print("\n--- API Request Error ---")
        print("Error:", e)
        if hasattr(e, 'response'):
            print("Response Text:", e.response.text)
            print("Response Headers:", e.response.headers)

# If no key works
print("\n--- No API Key Worked ---")
sys.exit(1) 