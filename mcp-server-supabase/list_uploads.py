# -*- coding: utf-8 -*-
import os
import sys
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing Supabase credentials")
    sys.exit(1)

supabase = create_client(url, key)

try:
    # Fetch recent uploads
    result = supabase.table("part_searches").select("*").order("created_at", desc=True).limit(10).execute()

    # Print results
    print("Recent Uploads:")
    print("===============")
    
    if not result.data:
        print("No recent uploads found.")
        sys.exit(0)

    for index, upload in enumerate(result.data, 1):
        print(f"{index}. Upload Details:")
        print(f"   Image Name: {upload.get("image_name", "N/A")}")
        print(f"   Image URL: {upload.get("image_url", "N/A")}")
        print(f"   Upload Date: {upload.get("created_at", "N/A")}")
        print(f"   User ID: {upload.get("user_id", "N/A")}")
        print("---")

except Exception as e:
    print(f"Error: {str(e)}")
    sys.exit(1)
