#!/usr/bin/env python3
"""
Migrate job files to Supabase using MCP tools
This script reads local job files and inserts them into the Supabase jobs table
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

def prepare_job_data(job_id, job_data):
    """Prepare job data for database insertion"""
    return {
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
    
    for json_file in json_files:
        try:
            # Read the file
            job_data = read_job_file(json_file)
            if not job_data:
                error_count += 1
                continue
            
            # Get job ID (filename without .json)
            job_id = json_file.stem
            
            # Prepare data for database
            db_data = prepare_job_data(job_id, job_data)
            
            print(f"Processing {json_file.name}...")
            print(f"  Job ID: {job_id}")
            print(f"  Class: {db_data.get('class_name', 'Unknown')}")
            print(f"  Status: {db_data.get('status', 'Unknown')}")
            print(f"  Success: {db_data.get('success', False)}")
            
            # Note: We'll need to use the Supabase MCP tools to insert this data
            # For now, just prepare the data
            success_count += 1
            
        except Exception as e:
            print(f"ERROR: Failed to process {json_file.name}: {e}")
            error_count += 1
    
    print(f"\nMigration preparation complete:")
    print(f"  Successfully processed: {success_count}")
    print(f"  Errors: {error_count}")
    
    return error_count == 0

if __name__ == "__main__":
    print("This script prepares job data for migration.")
    print("The actual database insertion will be done using Supabase MCP tools.")
    print()
    
    if migrate_jobs():
        print("\n✅ Job data preparation successful!")
        print("Ready to insert into Supabase database.")
    else:
        print("\n❌ Job data preparation failed")
        exit(1)
