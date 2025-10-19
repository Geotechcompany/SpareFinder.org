#!/usr/bin/env python3
"""
Migrate existing job files to database storage
This script reads all job files from uploads/jobs/ and stores them in the database
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

def migrate_jobs_to_database():
    """Migrate all job files to database"""
    
    print("SpareFinder Job Migration to Database")
    print("=" * 50)
    
    # Import the database job store
    try:
        from app.services.db_job_store import db_job_store
        print("SUCCESS: Database job store imported")
    except Exception as e:
        print(f"ERROR: Failed to import database job store: {e}")
        return False
    
    # Check if database connection is working
    if not db_job_store.connection:
        print("ERROR: Database connection failed. Check your DATABASE_URL or DB_* environment variables.")
        return False
    
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
            
            # Save to database
            if db_job_store.save_job(job_id, job_data):
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
        test_jobs = db_job_store.list_jobs(limit=5)
        print(f"Database now contains {len(test_jobs)} jobs (showing first 5)")
        
        for job in test_jobs:
            print(f"  - {job['id']}: {job.get('class_name', 'Unknown')} ({job.get('status', 'Unknown')})")
    
    return error_count == 0

def setup_database():
    """Setup database schema"""
    print("Setting up database schema...")
    
    try:
        from app.services.db_job_store import db_job_store
        
        if not db_job_store.connection:
            print("ERROR: Database connection failed")
            return False
        
        # Read and execute schema
        schema_file = Path("database_schema.sql")
        if not schema_file.exists():
            print("ERROR: database_schema.sql not found")
            return False
        
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
        
        with db_job_store.connection.cursor() as cursor:
            cursor.execute(schema_sql)
            db_job_store.connection.commit()
        
        print("SUCCESS: Database schema created")
        return True
        
    except Exception as e:
        print(f"ERROR: Failed to setup database schema: {e}")
        return False

if __name__ == "__main__":
    print("1. Setting up database schema...")
    if not setup_database():
        print("ERROR: Database setup failed")
        exit(1)
    
    print("\n2. Migrating job files...")
    if migrate_jobs_to_database():
        print("\nSUCCESS: Migration completed successfully!")
        print("\nNext steps:")
        print("1. Update your main.py to use db_job_store instead of file-based storage")
        print("2. Test the /jobs endpoint")
        print("3. Deploy the updated service")
    else:
        print("\nERROR: Migration failed")
        exit(1)
