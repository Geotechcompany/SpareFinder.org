#!/usr/bin/env python3
"""
Setup Supabase database for jobs storage
This script helps you get the correct database URL and set up the jobs table
"""

import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_supabase_database_url():
    """Get the Supabase database URL from your project"""
    
    print("Supabase Database Setup")
    print("=" * 40)
    
    # Get Supabase URL
    supabase_url = os.getenv("SUPABASE_URL")
    if not supabase_url:
        print("ERROR: SUPABASE_URL not found in .env file")
        return None
    
    print(f"Supabase URL: {supabase_url}")
    
    # Extract project reference
    project_ref = supabase_url.split("//")[1].split(".")[0]
    print(f"Project Reference: {project_ref}")
    
    # Construct database URL
    database_url = f"postgresql://postgres:[YOUR_PASSWORD]@db.{project_ref}.supabase.co:5432/postgres"
    
    print(f"\nDatabase URL Template: {database_url}")
    print("\nTo get your database password:")
    print("1. Go to your Supabase Dashboard")
    print("2. Navigate to Settings -> Database")
    print("3. Copy the 'Connection string' or 'Password'")
    print("4. Replace [YOUR_PASSWORD] in the DATABASE_URL above")
    
    return database_url

def test_database_connection():
    """Test database connection"""
    
    print("\nTesting Database Connection...")
    
    try:
        from app.services.db_job_store import db_job_store
        
        if db_job_store.connection:
            print("✅ Database connection successful!")
            return True
        else:
            print("❌ Database connection failed")
            print("Make sure you've updated the DATABASE_URL in your .env file")
            return False
            
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

def setup_database_schema():
    """Setup the database schema"""
    
    print("\nSetting up database schema...")
    
    try:
        from app.services.db_job_store import db_job_store
        
        if not db_job_store.connection:
            print("❌ No database connection available")
            return False
        
        # Read and execute schema
        schema_file = "database_schema.sql"
        if not os.path.exists(schema_file):
            print(f"❌ Schema file not found: {schema_file}")
            return False
        
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
        
        with db_job_store.connection.cursor() as cursor:
            cursor.execute(schema_sql)
            db_job_store.connection.commit()
        
        print("✅ Database schema created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Failed to setup database schema: {e}")
        return False

def migrate_job_files():
    """Migrate existing job files to database"""
    
    print("\nMigrating job files to database...")
    
    try:
        from app.services.db_job_store import db_job_store
        import json
        from pathlib import Path
        
        if not db_job_store.connection:
            print("❌ No database connection available")
            return False
        
        # Get local jobs directory
        jobs_dir = Path("uploads/jobs")
        if not jobs_dir.exists():
            print(f"❌ Jobs directory not found: {jobs_dir}")
            return False
        
        # Get all JSON files
        json_files = list(jobs_dir.glob("*.json"))
        print(f"Found {len(json_files)} job files to migrate")
        
        if not json_files:
            print("⚠️ No job files found to migrate")
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
                    print(f"✅ Migrated {json_file.name}")
                    success_count += 1
                else:
                    print(f"❌ Failed to migrate {json_file.name}")
                    error_count += 1
                    
            except Exception as e:
                print(f"❌ Error processing {json_file.name}: {e}")
                error_count += 1
        
        print(f"\nMigration complete: {success_count} successful, {error_count} failed")
        
        # Test the migration
        if success_count > 0:
            print("\nTesting migration...")
            test_jobs = db_job_store.list_jobs(limit=5)
            print(f"Database now contains {len(test_jobs)} jobs")
            
            for job in test_jobs[:3]:  # Show first 3
                print(f"  - {job['id']}: {job.get('class_name', 'Unknown')} ({job.get('status', 'Unknown')})")
        
        return error_count == 0
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    print("1. Getting Supabase database URL...")
    db_url = get_supabase_database_url()
    
    if not db_url:
        print("\n❌ Setup failed. Please check your Supabase configuration.")
        exit(1)
    
    print("\n" + "="*50)
    print("NEXT STEPS:")
    print("1. Update your .env file with the correct DATABASE_URL")
    print("2. Run this script again to test the connection")
    print("3. The script will automatically migrate your job files")
    print("="*50)
    
    # Check if DATABASE_URL is properly configured
    current_db_url = os.getenv("DATABASE_URL")
    if current_db_url and "YOUR_PASSWORD" not in current_db_url:
        print("\n2. Testing database connection...")
        if test_database_connection():
            print("\n3. Setting up database schema...")
            if setup_database_schema():
                print("\n4. Migrating job files...")
                if migrate_job_files():
                    print("\n🎉 SUCCESS: Database setup complete!")
                    print("Your live server will now show all jobs!")
                else:
                    print("\n❌ Migration failed")
            else:
                print("\n❌ Schema setup failed")
        else:
            print("\n❌ Database connection failed")
    else:
        print("\n⚠️ Please update your DATABASE_URL in .env file first")
