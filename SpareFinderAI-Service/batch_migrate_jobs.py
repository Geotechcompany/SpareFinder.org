#!/usr/bin/env python3
"""
Batch migrate jobs to Supabase using MCP tools
This script migrates jobs one by one to avoid SQL formatting issues
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

def migrate_single_job(job_id, job_data):
    """Migrate a single job to Supabase"""
    
    # Prepare the data
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
    
    # Create a simple INSERT statement
    sql = f"""INSERT INTO jobs (
        id, filename, success, status, class_name, category, precise_part_name,
        material_composition, manufacturer, confidence_score, confidence_explanation,
        estimated_price, description, technical_data_sheet, compatible_vehicles,
        engine_types, buy_links, suppliers, fitment_tips, additional_instructions,
        full_analysis, processing_time_seconds, model_version
    ) VALUES (
        '{job_id}',
        '{job_data.get('filename', job_id).replace("'", "''")}',
        {str(job_data.get('success', False)).lower()},
        '{job_data.get('status', 'pending').replace("'", "''")}',
        {f"'{job_data.get('class_name', '').replace("'", "''")}'" if job_data.get('class_name') else 'NULL'},
        {f"'{job_data.get('category', '').replace("'", "''")}'" if job_data.get('category') else 'NULL'},
        {f"'{job_data.get('precise_part_name', '').replace("'", "''")}'" if job_data.get('precise_part_name') else 'NULL'},
        {f"'{job_data.get('material_composition', '').replace("'", "''")}'" if job_data.get('material_composition') else 'NULL'},
        {f"'{job_data.get('manufacturer', '').replace("'", "''")}'" if job_data.get('manufacturer') else 'NULL'},
        {job_data.get('confidence_score') if job_data.get('confidence_score') is not None else 'NULL'},
        {f"'{job_data.get('confidence_explanation', '').replace("'", "''")}'" if job_data.get('confidence_explanation') else 'NULL'},
        '{json.dumps(job_data.get('estimated_price', {})).replace("'", "''")}',
        {f"'{job_data.get('description', '').replace("'", "''")}'" if job_data.get('description') else 'NULL'},
        '{json.dumps(job_data.get('technical_data_sheet', {})).replace("'", "''")}',
        '{json.dumps(job_data.get('compatible_vehicles', [])).replace("'", "''")}',
        '{json.dumps(job_data.get('engine_types', [])).replace("'", "''")}',
        '{json.dumps(job_data.get('buy_links', {})).replace("'", "''")}',
        '{json.dumps(job_data.get('suppliers', [])).replace("'", "''")}',
        {f"'{job_data.get('fitment_tips', '').replace("'", "''")}'" if job_data.get('fitment_tips') else 'NULL'},
        {f"'{job_data.get('additional_instructions', '').replace("'", "''")}'" if job_data.get('additional_instructions') else 'NULL'},
        {f"'{job_data.get('full_analysis', '').replace("'", "''")}'" if job_data.get('full_analysis') else 'NULL'},
        {job_data.get('processing_time_seconds') if job_data.get('processing_time_seconds') is not None else 'NULL'},
        {f"'{job_data.get('model_version', '').replace("'", "''")}'" if job_data.get('model_version') else 'NULL'}
    );"""
    
    return sql

def migrate_jobs():
    """Migrate all job files to Supabase"""
    
    print("SpareFinder Job Migration using Supabase MCP")
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
            
            # Create SQL for this job
            sql = migrate_single_job(job_id, job_data)
            
            # Save SQL to file for manual execution
            sql_file = f"migrate_job_{i:02d}_{job_id}.sql"
            with open(sql_file, 'w', encoding='utf-8') as f:
                f.write(f"-- Job {i}: {job_id}\n")
                f.write(sql + "\n")
            
            print(f"  SQL saved to: {sql_file}")
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
    print("Preparing job migration...")
    
    if migrate_jobs():
        print("\nSUCCESS: Job migration preparation successful!")
        print("Individual SQL files have been generated.")
        print("You can now execute these using Supabase MCP tools.")
    else:
        print("\nERROR: Job migration preparation failed")
        exit(1)
