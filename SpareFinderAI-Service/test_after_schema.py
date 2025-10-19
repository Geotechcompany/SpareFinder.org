#!/usr/bin/env python3
"""
Test migration after schema is created
"""

import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

def test_and_migrate():
    """Test connection and migrate jobs"""
    
    print("Testing Supabase after schema creation...")
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        print("ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY")
        return False
    
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    # Test connection
    try:
        url = f"{supabase_url}/rest/v1/jobs"
        params = {"select": "count"}
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            print("SUCCESS: Connected to Supabase jobs table")
        else:
            print(f"ERROR: Cannot connect to jobs table: {response.status_code}")
            return False
    except Exception as e:
        print(f"ERROR: Connection test failed: {e}")
        return False
    
    # Migrate a test job
    print("\nMigrating test job...")
    
    jobs_dir = Path("uploads/jobs")
    json_files = list(jobs_dir.glob("*.json"))
    
    if not json_files:
        print("ERROR: No job files found")
        return False
    
    # Test with first job
    test_file = json_files[0]
    print(f"Testing with: {test_file.name}")
    
    with open(test_file, 'r', encoding='utf-8') as f:
        job_data = json.load(f)
    
    job_id = test_file.stem
    insert_data = {
        'id': job_id,
        'filename': job_data.get('filename', job_id),
        'success': job_data.get('success', False),
        'status': job_data.get('status', 'pending'),
        'class_name': job_data.get('class_name'),
        'category': job_data.get('category'),
        'precise_part_name': job_data.get('precise_part_name'),
        'manufacturer': job_data.get('manufacturer'),
        'confidence_score': job_data.get('confidence_score'),
        'description': job_data.get('description'),
        'estimated_price': job_data.get('estimated_price', {}),
        'technical_data_sheet': job_data.get('technical_data_sheet', {}),
        'suppliers': job_data.get('suppliers', []),
        'full_analysis': job_data.get('full_analysis'),
        'processing_time_seconds': job_data.get('processing_time_seconds'),
        'model_version': job_data.get('model_version'),
    }
    
    try:
        url = f"{supabase_url}/rest/v1/jobs"
        response = requests.post(url, headers=headers, json=insert_data)
        
        if response.status_code in [200, 201]:
            print(f"SUCCESS: Test job {job_id} saved to Supabase")
            
            # Verify it was saved
            verify_url = f"{supabase_url}/rest/v1/jobs?id=eq.{job_id}"
            verify_response = requests.get(verify_url, headers=headers)
            
            if verify_response.status_code == 200:
                jobs = verify_response.json()
                if jobs:
                    print(f"SUCCESS: Test job {job_id} verified in Supabase")
                    print(f"  Class: {jobs[0].get('class_name', 'Unknown')}")
                    print(f"  Status: {jobs[0].get('status', 'Unknown')}")
                    return True
                else:
                    print("ERROR: Test job not found after saving")
                    return False
            else:
                print("ERROR: Could not verify test job")
                return False
        else:
            print(f"ERROR: Failed to save test job: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"ERROR: Test migration failed: {e}")
        return False

if __name__ == "__main__":
    print("Supabase Test After Schema Creation")
    print("=" * 50)
    
    if test_and_migrate():
        print("\n🎉 SUCCESS: Supabase is working!")
        print("You can now migrate all your jobs.")
        print("\nTo migrate all jobs, run:")
        print("python migrate_all_jobs.py")
    else:
        print("\n❌ FAILED: Please check your Supabase setup")
        print("Make sure you've created the jobs table in Supabase SQL Editor")
