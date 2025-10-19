#!/usr/bin/env python3
"""
Migrate all job files to Supabase using MCP tools
This script reads all local job files and inserts them into the Supabase jobs table
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

def create_insert_sql(job_data):
    """Create SQL INSERT statement for a job"""
    
    # Escape single quotes in text fields
    def escape_sql_string(value):
        if value is None:
            return 'NULL'
        if isinstance(value, str):
            return f"'{value.replace("'", "''")}'"
        if isinstance(value, bool):
            return 'true' if value else 'false'
        if isinstance(value, (dict, list)):
            return f"'{json.dumps(value).replace("'", "''")}'"
        return str(value)
    
    # Build the INSERT statement
    sql = f"""INSERT INTO jobs (
        id, filename, success, status, class_name, category, precise_part_name,
        material_composition, manufacturer, confidence_score, confidence_explanation,
        estimated_price, description, technical_data_sheet, compatible_vehicles,
        engine_types, buy_links, suppliers, fitment_tips, additional_instructions,
        full_analysis, processing_time_seconds, model_version, supplier_enrichment,
        mode, results, markdown, query
    ) VALUES (
        {escape_sql_string(job_data['id'])},
        {escape_sql_string(job_data['filename'])},
        {escape_sql_string(job_data['success'])},
        {escape_sql_string(job_data['status'])},
        {escape_sql_string(job_data['class_name'])},
        {escape_sql_string(job_data['category'])},
        {escape_sql_string(job_data['precise_part_name'])},
        {escape_sql_string(job_data['material_composition'])},
        {escape_sql_string(job_data['manufacturer'])},
        {escape_sql_string(job_data['confidence_score'])},
        {escape_sql_string(job_data['confidence_explanation'])},
        {escape_sql_string(job_data['estimated_price'])},
        {escape_sql_string(job_data['description'])},
        {escape_sql_string(job_data['technical_data_sheet'])},
        {escape_sql_string(job_data['compatible_vehicles'])},
        {escape_sql_string(job_data['engine_types'])},
        {escape_sql_string(job_data['buy_links'])},
        {escape_sql_string(job_data['suppliers'])},
        {escape_sql_string(job_data['fitment_tips'])},
        {escape_sql_string(job_data['additional_instructions'])},
        {escape_sql_string(job_data['full_analysis'])},
        {escape_sql_string(job_data['processing_time_seconds'])},
        {escape_sql_string(job_data['model_version'])},
        {escape_sql_string(job_data['supplier_enrichment'])},
        {escape_sql_string(job_data['mode'])},
        {escape_sql_string(job_data['results'])},
        {escape_sql_string(job_data['markdown'])},
        {escape_sql_string(job_data['query'])}
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
    sql_statements = []
    
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
            
            # Create SQL statement
            sql = create_insert_sql(db_data)
            sql_statements.append(sql)
            
            print(f"Prepared {json_file.name} - {db_data.get('class_name', 'Unknown')}")
            success_count += 1
            
        except Exception as e:
            print(f"ERROR: Failed to process {json_file.name}: {e}")
            error_count += 1
    
    print(f"\nPrepared {success_count} jobs for migration")
    print(f"Errors: {error_count}")
    
    # Save SQL statements to file for manual execution
    sql_file = "migrate_jobs.sql"
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write("-- SpareFinder Jobs Migration SQL\n")
        f.write("-- Generated automatically\n\n")
        for sql in sql_statements:
            f.write(sql + "\n\n")
    
    print(f"\nSQL statements saved to: {sql_file}")
    print("You can now execute these statements using Supabase MCP tools")
    
    return error_count == 0

if __name__ == "__main__":
    print("Preparing job migration...")
    
    if migrate_jobs():
        print("\n✅ Job migration preparation successful!")
        print("SQL statements have been generated and saved.")
    else:
        print("\n❌ Job migration preparation failed")
        exit(1)
