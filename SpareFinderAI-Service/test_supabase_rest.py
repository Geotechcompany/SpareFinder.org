#!/usr/bin/env python3
"""
Test Supabase REST API connection and migration
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

def test_supabase_connection():
    """Test Supabase REST API connection"""
    print("Testing Supabase REST API connection...")
    
    try:
        from app.services.supabase_rest_store import supabase_rest_store
        
        if supabase_rest_store.test_connection():
            print("SUCCESS: Supabase REST API connection established")
            return True
        else:
            print("ERROR: Supabase REST API connection failed")
            return False
            
    except Exception as e:
        print(f"ERROR: Supabase connection test failed: {e}")
        return False

def migrate_single_job():
    """Test migration with a single job file"""
    print("\nTesting migration with a single job...")
    
    try:
        from app.services.supabase_rest_store import supabase_rest_store
        
        # Get the first job file
        jobs_dir = Path("uploads/jobs")
        json_files = list(jobs_dir.glob("*.json"))
        
        if not json_files:
            print("ERROR: No job files found")
            return False
        
        # Test with the first file
        test_file = json_files[0]
        print(f"Testing with: {test_file.name}")
        
        # Read the file
        with open(test_file, 'r', encoding='utf-8') as f:
            job_data = json.load(f)
        
        job_id = test_file.stem
        
        # Try to save to Supabase
        if supabase_rest_store.save_job(job_id, job_data):
            print(f"SUCCESS: Test job {job_id} saved to Supabase")
            
            # Try to retrieve it
            retrieved_job = supabase_rest_store.load_job(job_id)
            if retrieved_job:
                print(f"SUCCESS: Test job {job_id} retrieved from Supabase")
                print(f"  Class: {retrieved_job.get('class_name', 'Unknown')}")
                print(f"  Status: {retrieved_job.get('status', 'Unknown')}")
                return True
            else:
                print(f"ERROR: Could not retrieve test job {job_id}")
                return False
        else:
            print(f"ERROR: Failed to save test job {job_id}")
            return False
            
    except Exception as e:
        print(f"ERROR: Migration test failed: {e}")
        return False

def migrate_all_jobs():
    """Migrate all job files to Supabase"""
    print("\nMigrating all job files to Supabase...")
    
    try:
        from app.services.supabase_rest_store import supabase_rest_store
        
        # Get local jobs directory
        jobs_dir = Path("uploads/jobs")
        json_files = list(jobs_dir.glob("*.json"))
        print(f"Found {len(json_files)} job files to migrate")
        
        if not json_files:
            print("WARNING: No job files found to migrate")
            return True
        
        # Migrate each file
        success_count = 0
        error_count = 0
        
        for json_file in json_files:
            try:
                # Read the file
                with open(json_file, 'r', encoding='utf-8') as f:
                    job_data = json.load(f)
                
                # Get the job ID (filename without .json)
                job_id = json_file.stem
                
                # Save to Supabase
                if supabase_rest_store.save_job(job_id, job_data):
                    print(f"SUCCESS: Migrated {json_file.name}")
                    success_count += 1
                else:
                    print(f"ERROR: Failed to migrate {json_file.name}")
                    error_count += 1
                    
            except Exception as e:
                print(f"ERROR: Failed to process {json_file.name}: {e}")
                error_count += 1
        
        print(f"\nMigration complete: {success_count} successful, {error_count} failed")
        
        # Test the migration
        if success_count > 0:
            print("\nTesting migration...")
            test_jobs = supabase_rest_store.list_jobs(limit=5)
            print(f"Supabase now contains {len(test_jobs)} jobs")
            
            for job in test_jobs[:3]:  # Show first 3
                print(f"  - {job['id']}: {job.get('class_name', 'Unknown')} ({job.get('status', 'Unknown')})")
        
        return error_count == 0
        
    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        return False

if __name__ == "__main__":
    print("Supabase REST API Test and Migration")
    print("=" * 50)
    
    # Test connection
    if not test_supabase_connection():
        print("\nERROR: Cannot connect to Supabase")
        print("Please check your SUPABASE_URL and SUPABASE_ANON_KEY in .env file")
        exit(1)
    
    # Test with a single job
    if not migrate_single_job():
        print("\nERROR: Single job migration test failed")
        print("The database schema might not exist yet.")
        print("Please run the SQL from database_schema.sql in your Supabase SQL Editor first.")
        exit(1)
    
    # Migrate all jobs
    if migrate_all_jobs():
        print("\n🎉 SUCCESS: All jobs migrated to Supabase!")
        print("Your live server will now show all jobs!")
    else:
        print("\nERROR: Migration failed")
        exit(1)
