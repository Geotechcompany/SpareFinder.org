"""
Updated main.py with Supabase database integration
This replaces file-based storage with database storage
"""

import os
import uuid
import logging
import json
import asyncio
import sys
import signal
from typing import Dict, Any, Optional, List
import smtplib
from email.message import EmailMessage
import ssl
import base64
import io
import time
import requests

import uvicorn
from fastapi import (
    FastAPI, 
    File, 
    UploadFile, 
    HTTPException, 
    BackgroundTasks,
    Query
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY
from pydantic import BaseModel
from openai import OpenAI

from dotenv import load_dotenv

from .services.ai_service import analyze_part_image
from .services.email_templates import (
    analysis_started_subject,
    analysis_started_html,
    analysis_completed_subject,
    analysis_completed_html,
    analysis_failed_subject,
    analysis_failed_html,
    keyword_started_subject,
    keyword_started_html,
    keyword_completed_subject,
    keyword_completed_html,
)
from .services.scraper import scrape_supplier_page
from .services.enhanced_scraper import scrape_supplier_page as enhanced_scrape_supplier_page, scrape_multiple_suppliers
from .core.config import settings

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Initialize FastAPI app
app = FastAPI(title="SpareFinder AI Service", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for current analysis results
analysis_results: Dict[str, Any] = {}

# Updated /jobs endpoint to use database
@app.get("/jobs")
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
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

# New /jobs/stats endpoint
@app.get("/jobs/stats")
async def get_job_statistics():
    """Get job statistics from database"""
    try:
        stats = SupabaseJobStore.get_job_statistics()
        return JSONResponse(status_code=200, content={"success": True, "data": stats})
    except Exception as e:
        logger.error(f"/jobs/stats error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

# Updated job saving function
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

# Health check endpoint
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
        })

# Note: You'll need to update your analysis endpoints to use save_job_to_database()
# instead of save_job_snapshot() for new jobs to be stored in the database

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
