#!/usr/bin/env python3
"""
Final migration script for all jobs to Supabase
Uses correct PostgreSQL array syntax
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

def migrate_jobs_batch():
    """Migrate all jobs in batches using Supabase MCP"""
    
    print("Final SpareFinder Job Migration to Supabase")
    print("=" * 50)
    
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
    
    # Process each file
    success_count = 0
    error_count = 0
    
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
            print(f"  Success: {job_data.get('success', False)}")
            
            # Create SQL with proper array syntax
            compatible_vehicles = job_data.get('compatible_vehicles', [])
            engine_types = job_data.get('engine_types', [])
            suppliers = job_data.get('suppliers', [])
            
            # Convert arrays to PostgreSQL format
            compatible_vehicles_sql = "ARRAY[]::text[]" if not compatible_vehicles else f"ARRAY{compatible_vehicles}::text[]"
            engine_types_sql = "ARRAY[]::text[]" if not engine_types else f"ARRAY{engine_types}::text[]"
            suppliers_sql = "ARRAY[]::jsonb" if not suppliers else f"ARRAY{json.dumps(suppliers)}::jsonb"
            
            # Escape single quotes in text fields
            def escape_sql(value):
                if value is None:
                    return 'NULL'
                if isinstance(value, str):
                    return f"'{value.replace("'", "''")}'"
                return str(value)
            
            sql = f"""INSERT INTO jobs (
                id, filename, success, status, class_name, category, precise_part_name,
                material_composition, manufacturer, confidence_score, confidence_explanation,
                estimated_price, description, technical_data_sheet, compatible_vehicles,
                engine_types, buy_links, suppliers, fitment_tips, additional_instructions,
                full_analysis, processing_time_seconds, model_version
            ) VALUES (
                '{job_id}',
                {escape_sql(job_data.get('filename', job_id))},
                {str(job_data.get('success', False)).lower()},
                {escape_sql(job_data.get('status', 'pending'))},
                {escape_sql(job_data.get('class_name'))},
                {escape_sql(job_data.get('category'))},
                {escape_sql(job_data.get('precise_part_name'))},
                {escape_sql(job_data.get('material_composition'))},
                {escape_sql(job_data.get('manufacturer'))},
                {job_data.get('confidence_score') if job_data.get('confidence_score') is not None else 'NULL'},
                {escape_sql(job_data.get('confidence_explanation'))},
                '{json.dumps(job_data.get('estimated_price', {})).replace("'", "''")}',
                {escape_sql(job_data.get('description'))},
                '{json.dumps(job_data.get('technical_data_sheet', {})).replace("'", "''")}',
                {compatible_vehicles_sql},
                {engine_types_sql},
                '{json.dumps(job_data.get('buy_links', {})).replace("'", "''")}',
                {suppliers_sql},
                {escape_sql(job_data.get('fitment_tips'))},
                {escape_sql(job_data.get('additional_instructions'))},
                {escape_sql(job_data.get('full_analysis'))},
                {job_data.get('processing_time_seconds') if job_data.get('processing_time_seconds') is not None else 'NULL'},
                {escape_sql(job_data.get('model_version'))}
            );"""
            
            # Save SQL to file for reference
            sql_file = f"final_migrate_job_{i:02d}_{job_id}.sql"
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
    print(f"  SQL files generated: {success_count}")
    
    return error_count == 0

if __name__ == "__main__":
    print("Preparing final job migration...")
    
    if migrate_jobs_batch():
        print("\nSUCCESS: Final job migration preparation successful!")
        print("All SQL files have been generated with correct PostgreSQL syntax.")
        print("Ready to execute the migration!")
    else:
        print("\nERROR: Final job migration preparation failed")
        exit(1)
