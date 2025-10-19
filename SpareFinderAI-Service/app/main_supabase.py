"""
Updated main.py with Supabase job storage
Replace the existing /jobs endpoint with this code
"""

# Add this import at the top of your main.py
from app.services.supabase_job_store import supabase_job_store

# Replace the existing /jobs endpoint with this:
@app.get("/jobs")
async def list_jobs():
    try:
        # Get jobs from Supabase
        jobs = supabase_job_store.list_jobs(limit=1000)  # Adjust limit as needed
        
        # Also include any in-memory jobs that haven't been saved yet
        for k, v in analysis_results.items():
            # Check if job exists in Supabase
            existing_job = next((job for job in jobs if job['id'] == k), None)
            if not existing_job:
                jobs.append({"id": k, **v})
        
        return JSONResponse(status_code=200, content={"success": True, "results": jobs})
    except Exception as e:
        logger.error(f"/jobs error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

# Add new endpoints for better job management
@app.get("/jobs/stats")
async def get_job_statistics():
    """Get job statistics"""
    try:
        stats = supabase_job_store.get_job_statistics()
        return JSONResponse(status_code=200, content={"success": True, "data": stats})
    except Exception as e:
        logger.error(f"/jobs/stats error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """Get a specific job by ID"""
    try:
        job = supabase_job_store.load_job(job_id)
        if job:
            return JSONResponse(status_code=200, content={"success": True, "data": job})
        else:
            return JSONResponse(status_code=404, content={"success": False, "error": "Job not found"})
    except Exception as e:
        logger.error(f"/jobs/{job_id} error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a job by ID"""
    try:
        if supabase_job_store.delete_job(job_id):
            return JSONResponse(status_code=200, content={"success": True, "message": "Job deleted"})
        else:
            return JSONResponse(status_code=404, content={"success": False, "error": "Job not found"})
    except Exception as e:
        logger.error(f"/jobs/{job_id} DELETE error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

# Update the job saving logic in your analysis endpoints
# Replace calls to save_job_snapshot() with supabase_job_store.save_job()

# Example: In your analyze_part endpoint, replace:
# save_job_snapshot(job_id, result)
# with:
# supabase_job_store.save_job(job_id, result)
