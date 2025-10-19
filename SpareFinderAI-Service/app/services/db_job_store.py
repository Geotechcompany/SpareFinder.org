"""
Database-based job storage for SpareFinder AI Service
Replaces file-based storage with PostgreSQL database storage
"""

import os
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class DatabaseJobStore:
    """Database-based job storage"""
    
    def __init__(self):
        self.connection = None
        self._init_connection()
    
    def _init_connection(self):
        """Initialize database connection"""
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            
            # Get database connection details
            db_url = os.getenv("DATABASE_URL")
            if not db_url:
                # Fallback to individual environment variables
                db_host = os.getenv("DB_HOST", "localhost")
                db_port = os.getenv("DB_PORT", "5432")
                db_name = os.getenv("DB_NAME", "sparefinder")
                db_user = os.getenv("DB_USER", "postgres")
                db_password = os.getenv("DB_PASSWORD", "")
                
                db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
            
            self.connection = psycopg2.connect(
                db_url,
                cursor_factory=RealDictCursor
            )
            logger.info("Database connection established")
            
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            self.connection = None
    
    def save_job(self, job_id: str, job_data: Dict[str, Any]) -> bool:
        """Save job data to database"""
        if not self.connection:
            logger.error("No database connection available")
            return False
        
        try:
            with self.connection.cursor() as cursor:
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
                    'estimated_price': json.dumps(job_data.get('estimated_price', {})) if job_data.get('estimated_price') else None,
                    'description': job_data.get('description'),
                    'technical_data_sheet': json.dumps(job_data.get('technical_data_sheet', {})) if job_data.get('technical_data_sheet') else None,
                    'compatible_vehicles': job_data.get('compatible_vehicles', []),
                    'engine_types': job_data.get('engine_types', []),
                    'buy_links': json.dumps(job_data.get('buy_links', {})) if job_data.get('buy_links') else None,
                    'suppliers': json.dumps(job_data.get('suppliers', [])) if job_data.get('suppliers') else None,
                    'fitment_tips': job_data.get('fitment_tips'),
                    'additional_instructions': job_data.get('additional_instructions'),
                    'full_analysis': job_data.get('full_analysis'),
                    'processing_time_seconds': job_data.get('processing_time_seconds'),
                    'model_version': job_data.get('model_version'),
                    'supplier_enrichment': json.dumps(job_data.get('supplier_enrichment', [])) if job_data.get('supplier_enrichment') else None,
                    'mode': job_data.get('mode'),
                    'results': json.dumps(job_data.get('results', [])) if job_data.get('results') else None,
                    'markdown': job_data.get('markdown'),
                    'query': json.dumps(job_data.get('query', {})) if job_data.get('query') else None,
                }
                
                # Use UPSERT (INSERT ... ON CONFLICT)
                query = """
                INSERT INTO jobs (
                    id, filename, success, status, class_name, category, precise_part_name,
                    material_composition, manufacturer, confidence_score, confidence_explanation,
                    estimated_price, description, technical_data_sheet, compatible_vehicles,
                    engine_types, buy_links, suppliers, fitment_tips, additional_instructions,
                    full_analysis, processing_time_seconds, model_version, supplier_enrichment,
                    mode, results, markdown, query
                ) VALUES (
                    %(id)s, %(filename)s, %(success)s, %(status)s, %(class_name)s, %(category)s, %(precise_part_name)s,
                    %(material_composition)s, %(manufacturer)s, %(confidence_score)s, %(confidence_explanation)s,
                    %(estimated_price)s, %(description)s, %(technical_data_sheet)s, %(compatible_vehicles)s,
                    %(engine_types)s, %(buy_links)s, %(suppliers)s, %(fitment_tips)s, %(additional_instructions)s,
                    %(full_analysis)s, %(processing_time_seconds)s, %(model_version)s, %(supplier_enrichment)s,
                    %(mode)s, %(results)s, %(markdown)s, %(query)s
                )
                ON CONFLICT (id) DO UPDATE SET
                    filename = EXCLUDED.filename,
                    success = EXCLUDED.success,
                    status = EXCLUDED.status,
                    class_name = EXCLUDED.class_name,
                    category = EXCLUDED.category,
                    precise_part_name = EXCLUDED.precise_part_name,
                    material_composition = EXCLUDED.material_composition,
                    manufacturer = EXCLUDED.manufacturer,
                    confidence_score = EXCLUDED.confidence_score,
                    confidence_explanation = EXCLUDED.confidence_explanation,
                    estimated_price = EXCLUDED.estimated_price,
                    description = EXCLUDED.description,
                    technical_data_sheet = EXCLUDED.technical_data_sheet,
                    compatible_vehicles = EXCLUDED.compatible_vehicles,
                    engine_types = EXCLUDED.engine_types,
                    buy_links = EXCLUDED.buy_links,
                    suppliers = EXCLUDED.suppliers,
                    fitment_tips = EXCLUDED.fitment_tips,
                    additional_instructions = EXCLUDED.additional_instructions,
                    full_analysis = EXCLUDED.full_analysis,
                    processing_time_seconds = EXCLUDED.processing_time_seconds,
                    model_version = EXCLUDED.model_version,
                    supplier_enrichment = EXCLUDED.supplier_enrichment,
                    mode = EXCLUDED.mode,
                    results = EXCLUDED.results,
                    markdown = EXCLUDED.markdown,
                    query = EXCLUDED.query,
                    updated_at = NOW()
                """
                
                cursor.execute(query, insert_data)
                self.connection.commit()
                
                logger.info(f"Job {job_id} saved to database")
                return True
                
        except Exception as e:
            logger.error(f"Failed to save job {job_id}: {e}")
            if self.connection:
                self.connection.rollback()
            return False
    
    def load_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Load job data from database"""
        if not self.connection:
            logger.error("No database connection available")
            return None
        
        try:
            with self.connection.cursor() as cursor:
                query = "SELECT * FROM jobs WHERE id = %s"
                cursor.execute(query, (job_id,))
                result = cursor.fetchone()
                
                if result:
                    # Convert to dictionary and parse JSON fields
                    job_data = dict(result)
                    
                    # Parse JSON fields
                    json_fields = ['estimated_price', 'technical_data_sheet', 'buy_links', 'suppliers', 'supplier_enrichment', 'results', 'query']
                    for field in json_fields:
                        if job_data.get(field):
                            try:
                                job_data[field] = json.loads(job_data[field])
                            except (json.JSONDecodeError, TypeError):
                                job_data[field] = {}
                    
                    logger.info(f"Job {job_id} loaded from database")
                    return job_data
                else:
                    logger.warning(f"Job {job_id} not found in database")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to load job {job_id}: {e}")
            return None
    
    def list_jobs(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """List all jobs with pagination"""
        if not self.connection:
            logger.error("No database connection available")
            return []
        
        try:
            with self.connection.cursor() as cursor:
                query = """
                SELECT * FROM jobs 
                ORDER BY created_at DESC 
                LIMIT %s OFFSET %s
                """
                cursor.execute(query, (limit, offset))
                results = cursor.fetchall()
                
                jobs = []
                for result in results:
                    job_data = dict(result)
                    
                    # Parse JSON fields
                    json_fields = ['estimated_price', 'technical_data_sheet', 'buy_links', 'suppliers', 'supplier_enrichment', 'results', 'query']
                    for field in json_fields:
                        if job_data.get(field):
                            try:
                                job_data[field] = json.loads(job_data[field])
                            except (json.JSONDecodeError, TypeError):
                                job_data[field] = {}
                    
                    jobs.append(job_data)
                
                logger.info(f"Retrieved {len(jobs)} jobs from database")
                return jobs
                
        except Exception as e:
            logger.error(f"Failed to list jobs: {e}")
            return []
    
    def get_job_statistics(self) -> Dict[str, Any]:
        """Get job statistics"""
        if not self.connection:
            logger.error("No database connection available")
            return {}
        
        try:
            with self.connection.cursor() as cursor:
                cursor.execute("SELECT * FROM get_job_statistics()")
                result = cursor.fetchone()
                
                if result:
                    return dict(result)
                else:
                    return {}
                    
        except Exception as e:
            logger.error(f"Failed to get job statistics: {e}")
            return {}
    
    def delete_job(self, job_id: str) -> bool:
        """Delete a job from database"""
        if not self.connection:
            logger.error("No database connection available")
            return False
        
        try:
            with self.connection.cursor() as cursor:
                query = "DELETE FROM jobs WHERE id = %s"
                cursor.execute(query, (job_id,))
                self.connection.commit()
                
                if cursor.rowcount > 0:
                    logger.info(f"Job {job_id} deleted from database")
                    return True
                else:
                    logger.warning(f"Job {job_id} not found for deletion")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to delete job {job_id}: {e}")
            if self.connection:
                self.connection.rollback()
            return False
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed")

# Global instance
db_job_store = DatabaseJobStore()
