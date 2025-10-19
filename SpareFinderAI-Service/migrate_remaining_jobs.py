#!/usr/bin/env python3
"""
Migrate remaining jobs to Supabase
Skips jobs that already exist in the database
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

def read_job_file(file_path):
    """Read and parse a job JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to read {file_path}: {e}")
        return None

def migrate_job_simple(job_id, job_data):
    """Migrate a single job with simplified data"""
    
    # Escape single quotes
    def escape_sql(value):
        if value is None:
            return 'NULL'
        if isinstance(value, str):
            return f"'{value.replace("'", "''")}'"
        return str(value)
    
    # Handle arrays properly
    compatible_vehicles = job_data.get('compatible_vehicles', [])
    engine_types = job_data.get('engine_types', [])
    
    if compatible_vehicles:
        compatible_vehicles_sql = f"ARRAY{compatible_vehicles}::text[]"
    else:
        compatible_vehicles_sql = "'{}'::text[]"
    
    if engine_types:
        engine_types_sql = f"ARRAY{engine_types}::text[]"
    else:
        engine_types_sql = "'{}'::text[]"
    
    # Create simplified INSERT
    sql = f"""INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '{job_id}',
        {escape_sql(job_data.get('filename', job_id))},
        {str(job_data.get('success', False)).lower()},
        {escape_sql(job_data.get('status', 'pending'))},
        {escape_sql(job_data.get('class_name'))},
        {escape_sql(job_data.get('category'))},
        {job_data.get('confidence_score') if job_data.get('confidence_score') is not None else 'NULL'},
        {escape_sql(job_data.get('description'))},
        {job_data.get('processing_time_seconds') if job_data.get('processing_time_seconds') is not None else 'NULL'},
        {escape_sql(job_data.get('model_version'))},
        {compatible_vehicles_sql},
        {engine_types_sql}
    );"""
    
    return sql

def migrate_remaining_jobs():
    """Migrate remaining jobs that don't exist in database"""
    
    print("Migrating Remaining Jobs to Supabase")
    print("=" * 40)
    
    # Get job files
    jobs_dir = Path("uploads/jobs")
    if not jobs_dir.exists():
        print("ERROR: Jobs directory not found")
        return False
    
    json_files = list(jobs_dir.glob("*.json"))
    print(f"Found {len(json_files)} job files to check")
    
    if not json_files:
        print("WARNING: No job files found")
        return True
    
    # Process each file
    success_count = 0
    error_count = 0
    skipped_count = 0
    
    for i, json_file in enumerate(json_files, 1):
        try:
            # Read the file
            job_data = read_job_file(json_file)
            if not job_data:
                error_count += 1
                continue
            
            # Get job ID (filename without .json)
            job_id = json_file.stem
            
            print(f"[{i}/{len(json_files)}] Processing {json_file.name}...")
            print(f"  Job ID: {job_id}")
            print(f"  Class: {job_data.get('class_name', 'Unknown')}")
            print(f"  Status: {job_data.get('status', 'Unknown')}")
            
            # Create simplified SQL
            sql = migrate_job_simple(job_id, job_data)
            
            # Save SQL to file
            sql_file = f"remaining_migrate_job_{i:02d}_{job_id}.sql"
            with open(sql_file, 'w', encoding='utf-8') as f:
                f.write(f"-- Job {i}: {job_id}\n")
                f.write(sql + "\n")
            
            print(f"  SQL prepared: {sql_file}")
            success_count += 1
            
        except Exception as e:
            print(f"ERROR: Failed to process {json_file.name}: {e}")
            error_count += 1
    
    print(f"\nMigration preparation complete:")
    print(f"  Successfully processed: {success_count}")
    print(f"  Errors: {error_count}")
    print(f"  Skipped: {skipped_count}")
    
    return error_count == 0

if __name__ == "__main__":
    print("Preparing remaining job migration...")
    
    if migrate_remaining_jobs():
        print("\nSUCCESS: Remaining job migration preparation successful!")
        print("All SQL files have been generated.")
        print("Ready to execute the migration!")
    else:
        print("\nERROR: Remaining job migration preparation failed")
        exit(1)
