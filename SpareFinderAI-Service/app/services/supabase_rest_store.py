"""
Supabase REST API-based job storage
Uses direct HTTP requests to avoid client compatibility issues
"""

import os
import json
import logging
import requests
from typing import Optional, Dict, Any, List
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class SupabaseRestStore:
    """Supabase-based job storage using REST API"""
    
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY")
        self.headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        
        if not self.supabase_url or not self.supabase_key:
            logger.error("Missing Supabase URL or ANON_KEY")
            self.supabase_url = None
            self.supabase_key = None
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Dict:
        """Make a request to Supabase REST API"""
        if not self.supabase_url or not self.supabase_key:
            raise Exception("Supabase not configured")
        
        url = f"{self.supabase_url}/rest/v1/{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=self.headers, params=data)
            elif method.upper() == "POST":
                response = requests.post(url, headers=self.headers, json=data)
            elif method.upper() == "PATCH":
                response = requests.patch(url, headers=self.headers, json=data)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=self.headers)
            else:
                raise Exception(f"Unsupported method: {method}")
            
            response.raise_for_status()
            return response.json() if response.content else {}
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Supabase API request failed: {e}")
            raise Exception(f"Supabase API request failed: {e}")
    
    def save_job(self, job_id: str, job_data: Dict[str, Any]) -> bool:
        """Save job data to Supabase database"""
        try:
            # Prepare the data for insertion
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
            
            # Use upsert (POST with Prefer: resolution=merge-duplicates)
            headers = self.headers.copy()
            headers["Prefer"] = "resolution=merge-duplicates"
            
            url = f"{self.supabase_url}/rest/v1/jobs"
            response = requests.post(url, headers=headers, json=insert_data)
            response.raise_for_status()
            
            logger.info(f"Job {job_id} saved to Supabase")
            return True
                
        except Exception as e:
            logger.error(f"Failed to save job {job_id}: {e}")
            return False
    
    def load_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Load job data from Supabase database"""
        try:
            result = self._make_request("GET", f"jobs?id=eq.{job_id}")
            
            if result and len(result) > 0:
                job_data = result[0]
                logger.info(f"Job {job_id} loaded from Supabase")
                return job_data
            else:
                logger.warning(f"Job {job_id} not found in Supabase")
                return None
                
        except Exception as e:
            logger.error(f"Failed to load job {job_id}: {e}")
            return None
    
    def list_jobs(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """List all jobs with pagination"""
        try:
            params = {
                "order": "created_at.desc",
                "limit": str(limit),
                "offset": str(offset)
            }
            
            result = self._make_request("GET", "jobs", params)
            jobs = result if isinstance(result, list) else []
            
            logger.info(f"Retrieved {len(jobs)} jobs from Supabase")
            return jobs
            
        except Exception as e:
            logger.error(f"Failed to list jobs: {e}")
            return []
    
    def get_job_statistics(self) -> Dict[str, Any]:
        """Get job statistics"""
        try:
            # Get all jobs for statistics
            jobs = self.list_jobs(limit=10000)
            
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
    
    def delete_job(self, job_id: str) -> bool:
        """Delete a job from Supabase database"""
        try:
            self._make_request("DELETE", f"jobs?id=eq.{job_id}")
            logger.info(f"Job {job_id} deleted from Supabase")
            return True
                
        except Exception as e:
            logger.error(f"Failed to delete job {job_id}: {e}")
            return False
    
    def test_connection(self) -> bool:
        """Test Supabase connection"""
        try:
            # Try to get a simple count
            result = self._make_request("GET", "jobs", {"select": "count"})
            logger.info("Supabase connection test successful")
            return True
        except Exception as e:
            logger.error(f"Supabase connection test failed: {e}")
            return False

# Global instance
supabase_rest_store = SupabaseRestStore()
