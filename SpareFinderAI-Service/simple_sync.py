#!/usr/bin/env python3
"""
Simple job sync using the existing job_store functions
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def sync_jobs():
    """Sync all local job files using the existing job_store functions"""
    
    print("SpareFinder Job Sync")
    print("=" * 40)
    
    # Import the job store functions
    try:
        from app.services.job_store import save_job_snapshot, load_job_snapshot
        print("SUCCESS: Imported job store functions")
    except Exception as e:
        print(f"ERROR: Failed to import job store: {e}")
        return False
    
    # Get local jobs directory
    jobs_dir = Path("uploads/jobs")
    if not jobs_dir.exists():
        print(f"ERROR: Jobs directory not found: {jobs_dir}")
        return False
    
    # Get all JSON files
    json_files = list(jobs_dir.glob("*.json"))
    print(f"Found {len(json_files)} job files to sync")
    
    if not json_files:
        print("WARNING: No job files found to sync")
        return True
    
    # Process each file
    success_count = 0
    error_count = 0
    
    for json_file in json_files:
        try:
            # Read the file
            with open(json_file, 'r', encoding='utf-8') as f:
                job_data = json.load(f)
            
            # Get the job ID (filename without .json)
            job_id = json_file.stem
            
            # Use the existing save function to upload to Supabase
            save_job_snapshot(job_id, job_data)
            
            print(f"SUCCESS: Processed {json_file.name}")
            success_count += 1
            
        except Exception as e:
            print(f"ERROR: Failed to process {json_file.name}: {e}")
            error_count += 1
    
    print(f"Sync complete: {success_count} successful, {error_count} failed")
    return error_count == 0

def test_live_server():
    """Test if the live server now has the data"""
    try:
        import requests
        response = requests.get('https://ai-sparefinder-com.onrender.com/jobs')
        data = response.json()
        job_count = len(data.get('results', []))
        print(f"Live server now returns {job_count} jobs")
        return job_count > 0
    except Exception as e:
        print(f"ERROR: Could not test live server: {e}")
        return False

if __name__ == "__main__":
    print("1. Syncing job files...")
    if sync_jobs():
        print("SUCCESS: Sync completed!")
        
        print("\n2. Testing live server...")
        if test_live_server():
            print("SUCCESS: Live server now has job data!")
        else:
            print("WARNING: Live server still shows no jobs")
    else:
        print("ERROR: Sync failed")
