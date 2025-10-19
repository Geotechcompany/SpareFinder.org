#!/usr/bin/env python3
"""
Update main.py to use Supabase database instead of local files
This script modifies the existing main.py file
"""

import os
import re
from pathlib import Path

def update_main_py():
    """Update main.py to use database storage"""
    
    main_file = Path("app/main.py")
    if not main_file.exists():
        print("ERROR: app/main.py not found")
        return False
    
    # Read the current file
    with open(main_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print("Updating main.py to use Supabase database...")
    
    # 1. Add Supabase imports and configuration
    supabase_imports = '''
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing Supabase configuration")
    sys.exit(1)

# Supabase headers
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

class SupabaseJobStore:
    """Supabase job storage using REST API"""
    
    @staticmethod
    def save_job(job_id: str, job_data: Dict[str, Any]) -> bool:
        """Save job to Supabase database"""
        try:
            # Prepare data for database
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
            url = f"{SUPABASE_URL}/rest/v1/jobs"
            response = requests.post(url, headers=SUPABASE_HEADERS, json=insert_data)
            
            if response.status_code in [200, 201]:
                logger.info(f"Job {job_id} saved to Supabase database")
                return True
            else:
                logger.error(f"Failed to save job {job_id}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to save job {job_id}: {e}")
            return False
    
    @staticmethod
    def list_jobs(limit: int = 1000) -> List[Dict[str, Any]]:
        """List all jobs from Supabase database"""
        try:
            url = f"{SUPABASE_URL}/rest/v1/jobs"
            params = {
                "order": "created_at.desc",
                "limit": str(limit)
            }
            
            response = requests.get(url, headers=SUPABASE_HEADERS, params=params)
            
            if response.status_code == 200:
                jobs = response.json()
                logger.info(f"Retrieved {len(jobs)} jobs from Supabase database")
                return jobs
            else:
                logger.error(f"Failed to list jobs: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to list jobs: {e}")
            return []
    
    @staticmethod
    def get_job_statistics() -> Dict[str, Any]:
        """Get job statistics from Supabase database"""
        try:
            # Get all jobs for statistics
            jobs = SupabaseJobStore.list_jobs(limit=10000)
            
            total_jobs = len(jobs)
            successful_jobs = len([j for j in jobs if j.get('success', False)])
            failed_jobs = len([j for j in jobs if not j.get('success', False)])
            pending_jobs = len([j for j in jobs if j.get('status') in ['pending', 'processing']])
            
            confidence_scores = [j.get('confidence_score', 0) for j in jobs if j.get('confidence_score')]
            avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
            
            processing_times = [j.get('processing_time_seconds', 0) for j in jobs if j.get('processing_time_seconds')]
            avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
            
            return {
                'total_jobs': total_jobs,
                'successful_jobs': successful_jobs,
                'failed_jobs': failed_jobs,
                'pending_jobs': pending_jobs,
                'avg_confidence': round(avg_confidence, 2),
                'avg_processing_time': round(avg_processing_time, 2)
            }
            
        except Exception as e:
            logger.error(f"Failed to get job statistics: {e}")
            return {}

def save_job_to_database(job_id: str, job_data: Dict[str, Any]) -> bool:
    """Save job to database instead of local files"""
    try:
        # Save to Supabase database
        success = SupabaseJobStore.save_job(job_id, job_data)
        
        if success:
            # Also keep in memory for immediate access
            analysis_results[job_id] = job_data
            logger.info(f"Job {job_id} saved to database and memory")
        else:
            logger.error(f"Failed to save job {job_id} to database")
        
        return success
        
    except Exception as e:
        logger.error(f"Error saving job {job_id}: {e}")
        return False
'''
    
    # Add imports after existing imports
    if "import requests" not in content:
        content = content.replace(
            "from .services.job_store import save_job_snapshot, load_job_snapshot",
            supabase_imports
        )
    
    # 2. Update the /jobs endpoint
    old_jobs_endpoint = '''@app.get("/jobs")
async def list_jobs():
    try:
        # Load all job snapshots from file system
        jobs = []
        jobs_dir = os.path.join(os.getcwd(), "uploads", "jobs")
        
        # First, add in-memory jobs
        for k, v in analysis_results.items():
            jobs.append({"id": k, **v})
        
        # Then, load job snapshots from file system
        if os.path.exists(jobs_dir):
            for filename in os.listdir(jobs_dir):
                if filename.endswith('.json'):
                    job_id = filename[:-5]  # Remove .json extension
                    # Skip if already in memory
                    if job_id not in analysis_results:
                        try:
                            job_data = load_job_snapshot(job_id)
                            if job_data:
                                jobs.append({"id": job_id, **job_data})
                        except Exception as e:
                            logger.warning(f"Failed to load job snapshot {job_id}: {e}")
        
        return JSONResponse(status_code=200, content={"success": True, "results": jobs})
    except Exception as e:
        logger.error(f"/jobs error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})'''
    
    new_jobs_endpoint = '''@app.get("/jobs")
async def list_jobs():
    try:
        # Get jobs from Supabase database
        jobs = SupabaseJobStore.list_jobs(limit=1000)
        
        # Also include any in-memory jobs that haven't been saved yet
        for k, v in analysis_results.items():
            # Check if job exists in database
            existing_job = next((job for job in jobs if job['id'] == k), None)
            if not existing_job:
                jobs.append({"id": k, **v})
        
        return JSONResponse(status_code=200, content={"success": True, "results": jobs})
    except Exception as e:
        logger.error(f"/jobs error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})'''
    
    content = content.replace(old_jobs_endpoint, new_jobs_endpoint)
    
    # 3. Add /jobs/stats endpoint
    stats_endpoint = '''
@app.get("/jobs/stats")
async def get_job_statistics():
    """Get job statistics from database"""
    try:
        stats = SupabaseJobStore.get_job_statistics()
        return JSONResponse(status_code=200, content={"success": True, "data": stats})
    except Exception as e:
        logger.error(f"/jobs/stats error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})'''
    
    # Add stats endpoint after the jobs endpoint
    content = content.replace(
        '        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})',
        '        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})' + stats_endpoint
    )
    
    # 4. Replace save_job_snapshot calls with save_job_to_database
    content = content.replace('save_job_snapshot(', 'save_job_to_database(')
    
    # 5. Add health check endpoint
    health_endpoint = '''
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        jobs = SupabaseJobStore.list_jobs(limit=1)
        return JSONResponse(status_code=200, content={
            "status": "healthy",
            "database": "connected",
            "jobs_count": len(jobs)
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(status_code=500, content={
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        })'''
    
    # Add health check before the main block
    content = content.replace(
        'if __name__ == "__main__":',
        health_endpoint + '\n\nif __name__ == "__main__":'
    )
    
    # Write the updated content
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("SUCCESS: main.py updated to use Supabase database")
    return True

if __name__ == "__main__":
    if update_main_py():
        print("\n✅ main.py has been updated!")
        print("Your application will now:")
        print("  - Fetch history from Supabase database")
        print("  - Store new jobs in Supabase database")
        print("  - Provide statistics from database")
        print("\nNext steps:")
        print("1. Restart your application")
        print("2. Test the /jobs endpoint")
        print("3. Deploy to your live server")
    else:
        print("\n❌ Failed to update main.py")
