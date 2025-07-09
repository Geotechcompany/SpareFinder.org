# -*- coding: utf-8 -*-
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

# Ensure UTF-8 encoding
sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Initialize Supabase client
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(url, key)

def check_recent_uploads():
    print('Ì∂ºÔ∏è Recent Image Uploads:')
    print('=======================')
    
    try:
        # Fetch recent uploads
        response = supabase.table('part_searches').select(
            'id, image_name, image_url, created_at, user_id'
        ).order('created_at', desc=True).limit(10).execute()
        
        # Check if we have data
        if not response.data:
            print('‚ùó No recent uploads found.')
            return
        
        # Print upload details
        for index, upload in enumerate(response.data, 1):
            print(f'{index}. Image Details:')
            print(f'   Name: {upload.get(image_name, N/A)}')
            print(f'   URL: {upload.get(image_url, N/A)}')
            print(f'   Date: {datetime.fromisoformat(upload[created_at]).strftime(%Y-%m-%d %H:%M:%S)}')
            print(f'   User ID: {upload.get(user_id, N/A)}')
            print('')
    
    except Exception as e:
        print(f'‚ùå Error: {str(e)}')

# Run the function
check_recent_uploads()
