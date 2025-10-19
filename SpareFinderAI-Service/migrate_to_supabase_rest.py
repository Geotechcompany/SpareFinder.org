#!/usr/bin/env python3
"""
Migrate existing job files to Supabase using REST API
This avoids client compatibility issues
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

def setup_database_schema():
    """Setup the database schema using Supabase SQL editor"""
    print("Setting up database schema...")
    
    # Read the schema file
    schema_file = Path("database_schema.sql")
    if not schema_file.exists():
        print("ERROR: database_schema.sql not found")
        return False
    
    with open(schema_file, 'r') as f:
        schema_sql = f.read()
    
    print("=" * 60)
    print("DATABASE SCHEMA SETUP REQUIRED")
    print("=" * 60)
    print("Please follow these steps:")
    print("1. Go to your Supabase Dashboard")
    print("2. Navigate to SQL Editor")
    print("3. Copy and paste the following SQL:")
    print("=" * 60)
    print(schema_sql)
    print("=" * 60)
    print("4. Click 'Run' to execute the SQL")
    print("5. Press Enter here when done...")
    
    input("Press Enter when you've run the SQL in Supabase...")
    return True

def migrate_jobs_to_supabase():
    """Migrate all job files to Supabase database using REST API"""
    
    print("SpareFinder Job Migration to Supabase (REST API)")
    print("=" * 60)
    
    # Import the Supabase REST store
    try:
        from app.services.supabase_rest_store import supabase_rest_store
        print("SUCCESS: Supabase REST store imported")
    except Exception as e:
        print(f"ERROR: Failed to import Supabase REST store: {e}")
        return False
    
    # Test connection
    print("Testing Supabase connection...")
    if not supabase_rest_store.test_connection():
        print("ERROR: Supabase connection failed")
        print("Please check your SUPABASE_URL and SUPABASE_ANON_KEY in .env file")
        return False
    
    print("SUCCESS: Supabase connection established")
    
    # Get local jobs directory
    jobs_dir = Path("uploads/jobs")
    if not jobs_dir.exists():
        print(f"ERROR: Jobs directory not found: {jobs_dir}")
        return False
    
    # Get all JSON files
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
        
        # Test statistics
        stats = supabase_rest_store.get_job_statistics()
        if stats:
            print(f"\nJob Statistics:")
            print(f"  Total jobs: {stats.get('total_jobs', 0)}")
            print(f"  Successful: {stats.get('successful_jobs', 0)}")
            print(f"  Failed: {stats.get('failed_jobs', 0)}")
            print(f"  Avg confidence: {stats.get('avg_confidence', 0)}%")
    
    return error_count == 0

if __name__ == "__main__":
    print("1. Setting up database schema...")
    if not setup_database_schema():
        print("ERROR: Database schema setup failed")
        exit(1)
    
    print("\n2. Migrating job files...")
    if migrate_jobs_to_supabase():
        print("\n🎉 SUCCESS: Migration completed successfully!")
        print("\nYour live server will now show all jobs!")
        print("\nNext steps:")
        print("1. Update your main.py to use supabase_rest_store")
        print("2. Deploy the updated service")
        print("3. Test the /jobs endpoint on your live server")
    else:
        print("\nERROR: Migration failed")
        exit(1)
