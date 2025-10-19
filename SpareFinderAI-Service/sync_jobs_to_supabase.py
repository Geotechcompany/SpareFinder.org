#!/usr/bin/env python3
"""
Sync local job files to Supabase Storage
This script uploads all local job files to Supabase so the live server can access them.
"""

import os
import json
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def sync_jobs_to_supabase():
    """Sync all local job files to Supabase Storage"""
    
    # Get configuration
    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")).strip()
    bucket = os.getenv("SUPABASE_BUCKET_NAME") or os.getenv("S3_BUCKET_NAME", "sparefinder")
    
    if not supabase_url or not supabase_key:
        logger.error("ERROR: Missing Supabase credentials")
        return False
    
    try:
        from supabase import create_client
        client = create_client(supabase_url, supabase_key)
        logger.info("SUCCESS: Supabase client created successfully")
    except Exception as e:
        logger.error(f"ERROR: Failed to create Supabase client: {e}")
        return False
    
    # Get local jobs directory
    jobs_dir = Path("uploads/jobs")
    if not jobs_dir.exists():
        logger.error(f"ERROR: Jobs directory not found: {jobs_dir}")
        return False
    
    # Get all JSON files
    json_files = list(jobs_dir.glob("*.json"))
    logger.info(f"Found {len(json_files)} job files to sync")
    
    if not json_files:
        logger.warning("WARNING: No job files found to sync")
        return True
    
    # Upload each file
    success_count = 0
    error_count = 0
    
    for json_file in json_files:
        try:
            # Read the file
            with open(json_file, 'r', encoding='utf-8') as f:
                job_data = json.load(f)
            
            # Convert to bytes
            data_bytes = json.dumps(job_data, ensure_ascii=False).encode("utf-8")
            
            # Upload to Supabase Storage
            storage_path = f"jobs/{json_file.name}"
            
            # Use upsert to overwrite if exists
            result = client.storage.from_(bucket).upload(
                storage_path,
                data_bytes,
                file_options={
                    "content-type": "application/json",
                    "x-upsert": "true",
                },
            )
            
            logger.info(f"SUCCESS: Uploaded {json_file.name}")
            success_count += 1
            
        except Exception as e:
            logger.error(f"ERROR: Failed to upload {json_file.name}: {e}")
            error_count += 1
    
    logger.info(f"Sync complete: {success_count} successful, {error_count} failed")
    return error_count == 0

def test_supabase_connection():
    """Test if we can connect to Supabase and list files"""
    try:
        from supabase import create_client
        
        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_key = (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")).strip()
        bucket = os.getenv("SUPABASE_BUCKET_NAME") or os.getenv("S3_BUCKET_NAME", "sparefinder")
        
        if not supabase_url or not supabase_key:
            logger.error("ERROR: Missing Supabase credentials")
            return False
        
        client = create_client(supabase_url, supabase_key)
        
        # Test bucket access
        files = client.storage.from_(bucket).list()
        logger.info(f"SUCCESS: Connected to Supabase. Found {len(files)} files in bucket")
        
        # Check if jobs folder exists
        job_files = [f for f in files if f.get('name', '').startswith('jobs/')]
        logger.info(f"Found {len(job_files)} job files in Supabase Storage")
        
        return True
        
    except Exception as e:
        logger.error(f"ERROR: Supabase connection test failed: {e}")
        return False

if __name__ == "__main__":
    print("SpareFinder Job Sync to Supabase")
    print("=" * 50)
    
    # Test connection first
    print("1. Testing Supabase connection...")
    if not test_supabase_connection():
        print("ERROR: Cannot connect to Supabase. Check your credentials.")
        exit(1)
    
    print("\n2. Syncing job files...")
    if sync_jobs_to_supabase():
        print("SUCCESS: Sync completed successfully!")
        print("\n3. Testing live server...")
        
        # Test the live server
        try:
            import requests
            response = requests.get('https://ai-sparefinder-com.onrender.com/jobs')
            data = response.json()
            job_count = len(data.get('results', []))
            print(f"SUCCESS: Live server now returns {job_count} jobs")
        except Exception as e:
            print(f"WARNING: Could not test live server: {e}")
    else:
        print("ERROR: Sync failed. Check the logs above.")
        exit(1)
