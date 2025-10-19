#!/usr/bin/env python3
"""
Simple Supabase setup and migration
This creates the table and migrates data in one go
"""

import os
import json
import logging
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_jobs_table():
    """Create the jobs table using Supabase REST API"""
    print("Creating jobs table in Supabase...")
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for table creation
    
    if not supabase_url or not supabase_key:
        print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        return False
    
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    
    # Read the schema
    schema_file = Path("database_schema.sql")
    if not schema_file.exists():
        print("ERROR: database_schema.sql not found")
        return False
    
    with open(schema_file, 'r') as f:
        schema_sql = f.read()
    
    # Execute the SQL using Supabase REST API
    try:
        url = f"{supabase_url}/rest/v1/rpc/exec_sql"
        data = {"sql": schema_sql}
        
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code == 200:
            print("SUCCESS: Jobs table created")
            return True
        else:
            print(f"ERROR: Failed to create table: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"ERROR: Failed to create table: {e}")
        return False

def migrate_jobs_to_supabase():
    """Migrate job files to Supabase using REST API"""
    print("Migrating jobs to Supabase...")
    
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
    
    # Get job files
    jobs_dir = Path("uploads/jobs")
    if not jobs_dir.exists():
        print("ERROR: Jobs directory not found")
        return False
    
    json_files = list(jobs_dir.glob("*.json"))
    print(f"Found {len(json_files)} job files to migrate")
    
    if not json_files:
        print("WARNING: No job files found")
        return True
    
    # Migrate each file
    success_count = 0
    error_count = 0
    
    for json_file in json_files:
        try:
            # Read the file
            with open(json_file, 'r', encoding='utf-8') as f:
                job_data = json.load(f)
            
            # Prepare data for Supabase
            job_id = json_file.stem
            insert_data = {
                'id': job_id,
                'filename': job_data.get('filename', job_id),
                'success': job_data.get('success', False),
                'status': job_data.get('status', 'pending'),
                'class_name': job_data.get('class_name'),
                'category': job_data.get('category'),
                'precise_part_name': job_data.get('precise_part_name'),
                'material_composition': job_data.get('material_composition'),
                'manufacturer': job_data.get('manufacturer'),
                'confidence_score': job_data.get('confidence_score'),
                'confidence_explanation': job_data.get('confidence_explanation'),
                'estimated_price': job_data.get('estimated_price', {}),
                'description': job_data.get('description'),
                'technical_data_sheet': job_data.get('technical_data_sheet', {}),
                'compatible_vehicles': job_data.get('compatible_vehicles', []),
                'engine_types': job_data.get('engine_types', []),
                'buy_links': job_data.get('buy_links', {}),
                'suppliers': job_data.get('suppliers', []),
                'fitment_tips': job_data.get('fitment_tips'),
                'additional_instructions': job_data.get('additional_instructions'),
                'full_analysis': job_data.get('full_analysis'),
                'processing_time_seconds': job_data.get('processing_time_seconds'),
                'model_version': job_data.get('model_version'),
                'supplier_enrichment': job_data.get('supplier_enrichment', []),
                'mode': job_data.get('mode'),
                'results': job_data.get('results', []),
                'markdown': job_data.get('markdown'),
                'query': job_data.get('query', {}),
            }
            
            # Insert into Supabase
            url = f"{supabase_url}/rest/v1/jobs"
            response = requests.post(url, headers=headers, json=insert_data)
            
            if response.status_code in [200, 201]:
                print(f"SUCCESS: Migrated {json_file.name}")
                success_count += 1
            else:
                print(f"ERROR: Failed to migrate {json_file.name}: {response.status_code} - {response.text}")
                error_count += 1
                
        except Exception as e:
            print(f"ERROR: Failed to process {json_file.name}: {e}")
            error_count += 1
    
    print(f"\nMigration complete: {success_count} successful, {error_count} failed")
    return error_count == 0

def test_migration():
    """Test the migration by querying jobs"""
    print("Testing migration...")
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        print("ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY")
        return False
    
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    
    try:
        # Query jobs
        url = f"{supabase_url}/rest/v1/jobs"
        params = {"select": "id,class_name,status", "limit": "5"}
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            jobs = response.json()
            print(f"SUCCESS: Found {len(jobs)} jobs in Supabase")
            
            for job in jobs[:3]:
                print(f"  - {job['id']}: {job.get('class_name', 'Unknown')} ({job.get('status', 'Unknown')})")
            
            return True
        else:
            print(f"ERROR: Failed to query jobs: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"ERROR: Failed to test migration: {e}")
        return False

if __name__ == "__main__":
    print("Simple Supabase Setup and Migration")
    print("=" * 50)
    
    # Step 1: Create table
    print("1. Creating jobs table...")
    if not create_jobs_table():
        print("ERROR: Failed to create jobs table")
        print("You may need to create it manually in Supabase SQL Editor")
        exit(1)
    
    # Step 2: Migrate jobs
    print("\n2. Migrating jobs...")
    if not migrate_jobs_to_supabase():
        print("ERROR: Migration failed")
        exit(1)
    
    # Step 3: Test migration
    print("\n3. Testing migration...")
    if not test_migration():
        print("ERROR: Migration test failed")
        exit(1)
    
    print("\n🎉 SUCCESS: Setup and migration completed!")
    print("Your live server will now show all jobs!")
    print("\nNext steps:")
    print("1. Update your main.py to use the Supabase REST API")
    print("2. Deploy the updated service")
    print("3. Test the /jobs endpoint on your live server")
