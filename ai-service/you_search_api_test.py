import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key from environment
YOUR_API_KEY =('1RiKD0ETU8N2v5f4wKRm7MWo')

def get_smart_results(query, instructions=""):
    headers = {"X-API-Key": YOUR_API_KEY}
    params = {"query": query, "instructions": instructions}
    return requests.get(
        "https://chat-api.you.com/smart",
        params=params,
        headers=headers,
    ).json()

# Test the function with a sample query
results = get_smart_results(
    "automotive parts identification technologies", 
    "Provide a comprehensive overview of modern technologies used in automotive part identification. Focus on technical details, emerging technologies, and practical applications."
)

# Print the results
print("API Key (first 10 chars):", YOUR_API_KEY[:10] + '...')
print("\nSearch Results:")
import json
print(json.dumps(results, indent=2))