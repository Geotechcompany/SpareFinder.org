"""
Supabase-based job storage for SpareFinder AI Service
Uses Supabase client instead of direct PostgreSQL connection
"""

import os
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class SupabaseJobStore:
    """Supabase-based job storage using Supabase client"""
    
    def __init__(self):
        self.client = None
        self._init_client()
    
    def _init_client(self):
        """Initialize Supabase client"""
        try:
            from supabase import create_client
            
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_ANON_KEY")
            
            if not supabase_url or not supabase_key:
                logger.error("Missing Supabase URL or ANON_KEY")
                return
            
            self.client = create_client(supabase_url, supabase_key)
            logger.info("Supabase client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            self.client = None
    
    def save_job(self, job_id: str, job_data: Dict[str, Any]) -> bool:
        """Save job data to Supabase database"""
        if not self.client:
            logger.error("No Supabase client available")
            return False
        
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
            
            # Use upsert to insert or update
            result = self.client.table('jobs').upsert(insert_data).execute()
            
            if result.data:
                logger.info(f"Job {job_id} saved to Supabase")
                return True
            else:
                logger.error(f"Failed to save job {job_id}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to save job {job_id}: {e}")
            return False
    
    def load_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Load job data from Supabase database"""
        if not self.client:
            logger.error("No Supabase client available")
            return None
        
        try:
            result = self.client.table('jobs').select('*').eq('id', job_id).execute()
            
            if result.data and len(result.data) > 0:
                job_data = result.data[0]
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
        if not self.client:
            logger.error("No Supabase client available")
            return []
        
        try:
            result = self.client.table('jobs').select('*').order('created_at', desc=True).range(offset, offset + limit - 1).execute()
            
            jobs = result.data if result.data else []
            logger.info(f"Retrieved {len(jobs)} jobs from Supabase")
            return jobs
            
        except Exception as e:
            logger.error(f"Failed to list jobs: {e}")
            return []
    
    def get_job_statistics(self) -> Dict[str, Any]:
        """Get job statistics using Supabase RPC"""
        if not self.client:
            logger.error("No Supabase client available")
            return {}
        
        try:
            # Use the RPC function we created
            result = self.client.rpc('get_job_statistics').execute()
            
            if result.data:
                return result.data[0] if isinstance(result.data, list) else result.data
            else:
                return {}
                
        except Exception as e:
            logger.error(f"Failed to get job statistics: {e}")
            # Fallback to manual calculation
            return self._calculate_stats_manually()
    
    def _calculate_stats_manually(self) -> Dict[str, Any]:
        """Calculate statistics manually as fallback"""
        try:
            jobs = self.list_jobs(limit=10000)  # Get all jobs
            
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
            logger.error(f"Failed to calculate statistics manually: {e}")
            return {}
    
    def delete_job(self, job_id: str) -> bool:
        """Delete a job from Supabase database"""
        if not self.client:
            logger.error("No Supabase client available")
            return False
        
        try:
            result = self.client.table('jobs').delete().eq('id', job_id).execute()
            
            if result.data is not None:
                logger.info(f"Job {job_id} deleted from Supabase")
                return True
            else:
                logger.warning(f"Job {job_id} not found for deletion")
                return False
                
        except Exception as e:
            logger.error(f"Failed to delete job {job_id}: {e}")
            return False
    
    def setup_database_schema(self) -> bool:
        """Setup the database schema using Supabase SQL editor"""
        logger.info("Database schema setup required.")
        logger.info("Please run the SQL from database_schema.sql in your Supabase SQL editor:")
        logger.info("1. Go to your Supabase Dashboard")
        logger.info("2. Navigate to SQL Editor")
        logger.info("3. Copy and paste the contents of database_schema.sql")
        logger.info("4. Run the SQL")
        return True

# Global instance
supabase_job_store = SupabaseJobStore()
