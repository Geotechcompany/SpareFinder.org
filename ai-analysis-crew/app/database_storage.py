"""
Database Storage Module for SpareFinder AI Research
Stores comprehensive analysis results to Supabase database
"""

import os
import logging
import requests
from typing import Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("⚠️ Supabase configuration not found - database storage will be disabled")
else:
    logger.info(f"✅ Supabase configured: {SUPABASE_URL[:30]}...")

# Supabase headers
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}


def safe_int(value):
    """Convert value to int, handling None and float values"""
    if value is None:
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def safe_float(value):
    """Convert value to float, handling None values"""
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def store_crew_analysis_to_database(
    analysis_id: str,
    user_email: str,
    analysis_data: Dict[str, Any],
    image_url: Optional[str] = None,
    keywords: Optional[str] = None
) -> bool:
    """
    Store SpareFinder AI Research results to Supabase database
    
    Args:
        analysis_id: Unique identifier for this analysis
        user_email: Email address of the user who requested analysis
        analysis_data: Complete analysis results from all agents
        image_url: URL of the analyzed image (if any)
        keywords: Keywords used in analysis (if any)
        
    Returns:
        bool: True if storage successful, False otherwise
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning("Supabase not configured - skipping database storage")
            return False
            
        # Validate analysis_id is a proper UUID
        import uuid as uuid_lib
        try:
            # Try to parse as UUID to validate format
            uuid_lib.UUID(analysis_id)
        except ValueError:
            # If not a valid UUID, generate a new one and log warning
            logger.warning(f"⚠️ Invalid UUID format '{analysis_id}', generating new UUID")
            analysis_id = str(uuid_lib.uuid4())
            
        logger.info(f"📊 Storing SpareFinder AI Research to database: {analysis_id}")
        
        # Parse the comprehensive report text to extract structured data
        report_text = analysis_data.get('report_text', '')
        
        # Extract part details from report
        part_name = _extract_part_name(report_text)
        manufacturer = _extract_manufacturer(report_text)
        category = _extract_category(report_text)
        confidence_score = _extract_confidence(report_text)
        
        # Get user_id from email (might be None if user not found)
        user_id = get_user_id_from_email(user_email)
        
        # Prepare data for jobs table (comprehensive storage)
        job_data = {
            'id': analysis_id,
            'filename': analysis_id,
            'success': True,
            'status': 'completed',
            'class_name': part_name,
            'category': category,
            'manufacturer': manufacturer,
            'confidence_score': safe_int(confidence_score * 100) if confidence_score else 95,
            'precise_part_name': part_name,
            'description': _extract_description(report_text),
            'full_analysis': report_text,
            'processing_time_seconds': safe_int(analysis_data.get('processing_time', 180)),
            'model_version': 'AI Crew v2.0 (GPT-4o Vision + CrewAI)',
            'mode': 'ai_crew_comprehensive',
            'image_url': image_url,
            'query': {'keywords': keywords.split() if keywords else [], 'email': user_email},
            'suppliers': _extract_suppliers(report_text),
            'technical_data_sheet': _extract_technical_specs(report_text),
            'compatible_vehicles': _extract_compatible_vehicles(report_text),
            'buy_links': _extract_buy_links(report_text),
            'estimated_price': _extract_pricing(report_text),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # Add user_id if available (now supported in schema)
        if user_id:
            job_data['user_id'] = user_id
        
        # Store in jobs table
        jobs_url = f"{SUPABASE_URL}/rest/v1/jobs"
        logger.info(f"📤 Upserting to jobs table: {jobs_url}")
        
        response = requests.post(jobs_url, headers=SUPABASE_HEADERS, json=job_data)
        logger.info(f"📊 Jobs table response: {response.status_code}")
        
        if response.status_code not in [200, 201]:
            logger.error(f"❌ Failed to store in jobs table: {response.status_code} - {response.text}")
            return False
        
        logger.info(f"✅ Stored in jobs table successfully")
        
        # Also store in part_searches table for comprehensive tracking
        # (user_id was already retrieved earlier)
        search_data = {
            'id': analysis_id,
            'user_id': user_id,  # Add user_id for RLS
            'search_term': keywords or 'SpareFinder AI Research',
            'search_type': 'advanced',  # Use 'advanced' as per part_searches check constraint
            'part_name': part_name,
            'manufacturer': manufacturer,
            'category': category,
            'confidence_score': safe_int(confidence_score * 100) if confidence_score else 95,
            'processing_time': safe_int(analysis_data.get('processing_time', 180)),
            'processing_time_ms': safe_int(analysis_data.get('processing_time', 180) * 1000),
            'model_version': 'AI Crew v2.0 (GPT-4o Vision + CrewAI)',
            'analysis_status': 'completed',
            'image_url': image_url,
            'image_name': f'crew_analysis_{analysis_id[:8]}.jpg',
            'upload_source': 'ai_crew',
            'metadata': {
                'analysis': job_data,
                'user_email': user_email,
                'analysis_method': 'ai_crew_multi_agent',
                'agents_used': [
                    'image_analysis',
                    'part_identifier',
                    'technical_research',
                    'supplier_finder',
                    'report_generator'
                ]
            },
            'created_at': datetime.utcnow().isoformat()
        }
        
        searches_url = f"{SUPABASE_URL}/rest/v1/part_searches"
        logger.info(f"📤 Upserting to part_searches table: {searches_url}")
        
        response = requests.post(searches_url, headers=SUPABASE_HEADERS, json=search_data)
        logger.info(f"📊 Part searches response: {response.status_code}")
        
        if response.status_code not in [200, 201]:
            logger.warning(f"⚠️ Failed to store in part_searches table: {response.status_code} - {response.text}")
            # Don't fail the whole operation if part_searches fails
        else:
            logger.info(f"✅ Stored in part_searches table successfully")
        
        logger.info(f"🎉 Successfully stored SpareFinder AI Research {analysis_id} to database")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to store analysis to database: {e}")
        return False


# Helper functions to extract structured data from report text

def _extract_part_name(report_text: str) -> str:
    """Extract part name from report"""
    try:
        import re
        # Look for patterns like "Name: ..." or "Part Name: ..."
        match = re.search(r'(?:Part )?Name[:\s]+([^\n]+)', report_text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        # Fallback: look in first section
        lines = report_text.split('\n')
        for line in lines[:20]:
            if ':' in line and not line.startswith('#'):
                return line.split(':', 1)[1].strip()
        return "Unidentified Part"
    except:
        return "Unidentified Part"


def _extract_manufacturer(report_text: str) -> Optional[str]:
    """Extract manufacturer from report"""
    try:
        import re
        match = re.search(r'Manufacturer[:\s]+([^\n]+)', report_text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    except:
        pass
    return None


def _extract_category(report_text: str) -> Optional[str]:
    """Extract category from report"""
    try:
        import re
        match = re.search(r'Category[:\s]+([^\n]+)', report_text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    except:
        pass
    return None


def _extract_confidence(report_text: str) -> Optional[float]:
    """Extract confidence score from report"""
    try:
        import re
        match = re.search(r'Confidence[:\s]+(\d+(?:\.\d+)?)', report_text, re.IGNORECASE)
        if match:
            return float(match.group(1)) / 100.0
    except:
        pass
    return 0.95  # Default high confidence for AI Crew


def _extract_description(report_text: str) -> str:
    """Extract description from report"""
    try:
        # Look for Full Analysis section
        import re
        match = re.search(r'\*\*2\. FULL ANALYSIS\*\*(.*?)(?=\*\*3\.|$)', report_text, re.DOTALL | re.IGNORECASE)
        if match:
            desc = match.group(1).strip()
            # Take first few sentences
            sentences = desc.split('.')[:3]
            return '. '.join(sentences) + '.'
    except:
        pass
    return "Comprehensive AI analysis completed"


def _extract_suppliers(report_text: str) -> list:
    """Extract suppliers from report"""
    suppliers = []
    try:
        import re
        # Look for supplier sections
        supplier_section = re.search(r'\*\*4\. TOP 3 SUPPLIERS\*\*(.*?)(?=\*\*5\.|$)', report_text, re.DOTALL | re.IGNORECASE)
        if supplier_section:
            supplier_text = supplier_section.group(1)
            # Extract individual suppliers
            supplier_blocks = re.findall(r'\*\*(\d+)\.\s*([^\*]+?)\*\*.*?(?=\*\*\d+\.|$)', supplier_text, re.DOTALL)
            for num, supplier_data in supplier_blocks:
                # Extract details
                name_match = re.search(r'^([^(]+)', supplier_data)
                phone_match = re.search(r'Phone[:\s]+([^\n]+)', supplier_data, re.IGNORECASE)
                email_match = re.search(r'Email[:\s]+([^\n]+)', supplier_data, re.IGNORECASE)
                website_match = re.search(r'Website[:\s]+([^\n]+)', supplier_data, re.IGNORECASE)
                price_match = re.search(r'Price Range[:\s]+([^\n]+)', supplier_data, re.IGNORECASE)
                
                supplier = {
                    'name': name_match.group(1).strip() if name_match else f"Supplier {num}",
                    'contact': phone_match.group(1).strip() if phone_match else '',
                    'url': website_match.group(1).strip() if website_match else '',
                    'price_range': price_match.group(1).strip() if price_match else '',
                    'email': email_match.group(1).strip() if email_match else ''
                }
                suppliers.append(supplier)
    except Exception as e:
        logger.warning(f"Failed to extract suppliers: {e}")
    return suppliers[:3]  # Return top 3


def _extract_technical_specs(report_text: str) -> Dict[str, str]:
    """Extract technical specifications from report"""
    specs = {}
    try:
        import re
        # Look for technical specifications section
        spec_section = re.search(r'\*\*3\. TECHNICAL SPECIFICATIONS\*\*(.*?)(?=\*\*4\.|$)', report_text, re.DOTALL | re.IGNORECASE)
        if spec_section:
            spec_text = spec_section.group(1)
            # Extract key-value pairs
            spec_lines = re.findall(r'[-•]\s*([^:]+):\s*([^\n]+)', spec_text)
            for key, value in spec_lines[:10]:  # Limit to 10 specs
                specs[key.strip().lower().replace(' ', '_')] = value.strip()
    except Exception as e:
        logger.warning(f"Failed to extract technical specs: {e}")
    return specs


def _extract_compatible_vehicles(report_text: str) -> list:
    """Extract compatible vehicles from report"""
    vehicles = []
    try:
        import re
        # Look for compatibility section
        compat_match = re.search(r'Compatib(?:le|ility)[^\n]*:(.*?)(?:\n\n|\*\*)', report_text, re.DOTALL | re.IGNORECASE)
        if compat_match:
            compat_text = compat_match.group(1)
            # Extract vehicle mentions
            vehicle_pattern = r'(?:\d{4}[-\s])?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+([A-Z][a-z0-9]+)'
            matches = re.findall(vehicle_pattern, compat_text)
            vehicles = [f"{make} {model}" for make, model in matches[:10]]
    except Exception as e:
        logger.warning(f"Failed to extract compatible vehicles: {e}")
    return vehicles


def _extract_buy_links(report_text: str) -> Dict[str, str]:
    """Extract buy links from report"""
    links = {}
    try:
        suppliers = _extract_suppliers(report_text)
        for i, supplier in enumerate(suppliers):
            if supplier.get('url'):
                links[supplier['name']] = supplier['url']
    except Exception as e:
        logger.warning(f"Failed to extract buy links: {e}")
    return links


def _extract_pricing(report_text: str) -> Dict[str, str]:
    """Extract pricing information from report"""
    pricing = {}
    try:
        import re
        # Look for price patterns
        price_patterns = [
            (r'New[:\s]+\$?([\d,]+(?:-[\d,]+)?)', 'new'),
            (r'Used[:\s]+\$?([\d,]+(?:-[\d,]+)?)', 'used'),
            (r'Refurb(?:ished)?[:\s]+\$?([\d,]+(?:-[\d,]+)?)', 'refurbished'),
        ]
        for pattern, key in price_patterns:
            match = re.search(pattern, report_text, re.IGNORECASE)
            if match:
                pricing[key] = f"${match.group(1)}"
    except Exception as e:
        logger.warning(f"Failed to extract pricing: {e}")
    return pricing


def get_user_id_from_email(email: str) -> Optional[str]:
    """Get user ID from email address"""
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            return None
            
        # Query profiles table for user_id
        url = f"{SUPABASE_URL}/rest/v1/profiles?email=eq.{email}&select=id"
        response = requests.get(url, headers=SUPABASE_HEADERS)
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                return data[0].get('id')
    except Exception as e:
        logger.warning(f"Failed to get user_id from email: {e}")
    return None


def create_crew_job(
    job_id: str,
    user_email: str,
    keywords: Optional[str] = None,
    image_url: Optional[str] = None
) -> bool:
    """
    Create a new SpareFinder Research job entry in the database
    
    Args:
        job_id: UUID for the job
        user_email: Email of the user who requested the analysis
        keywords: Optional keywords for the search
        image_url: Optional image URL
        
    Returns:
        bool: True if creation successful, False otherwise
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning("Supabase not configured - skipping job creation")
            return False
        
        # Get user_id from email
        user_id = get_user_id_from_email(user_email)
        if not user_id:
            logger.error(f"❌ Could not find user_id for email: {user_email}")
            return False
        
        # Create new job entry (matching actual crew_analysis_jobs table schema)
        job_data = {
            'id': job_id,
            'user_id': user_id,
            'user_email': user_email,
            'keywords': keywords,
            'status': 'pending',
            'progress': 0,
            'current_stage': 'initialization',
            'image_url': image_url,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        url = f"{SUPABASE_URL}/rest/v1/crew_analysis_jobs"
        # Use fresh headers without Prefer to avoid schema cache issues
        fresh_headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json"
        }
        response = requests.post(url, headers=fresh_headers, json=job_data)
        
        if response.status_code not in [200, 201]:
            logger.error(f"❌ Failed to create crew job: {response.status_code} - {response.text}")
            return False
        
        logger.info(f"✅ Created crew job {job_id} for user {user_email}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating crew job: {e}")
        return False


def update_crew_job_status(
    job_id: str,
    status: str,
    current_stage: Optional[str] = None,
    progress: Optional[int] = None,
    error_message: Optional[str] = None
) -> bool:
    """
    Update the status of a SpareFinder Research job in the crew_analysis_jobs table
    
    Args:
        job_id: UUID of the job to update
        status: Status of the job (pending, processing, completed, failed)
        current_stage: Current stage of analysis (optional)
        progress: Progress percentage 0-100 (optional)
        error_message: Error message if failed (optional)
        
    Returns:
        bool: True if update successful, False otherwise
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning("Supabase not configured - skipping job status update")
            return False
        
        update_data = {
            'status': status,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if current_stage is not None:
            update_data['current_stage'] = current_stage
        if progress is not None:
            update_data['progress'] = progress
        if error_message is not None:
            update_data['error_message'] = error_message
        if status == 'completed':
            update_data['completed_at'] = datetime.utcnow().isoformat()
        
        url = f"{SUPABASE_URL}/rest/v1/crew_analysis_jobs?id=eq.{job_id}"
        response = requests.patch(url, headers=SUPABASE_HEADERS, json=update_data)
        
        if response.status_code not in [200, 204]:
            logger.error(f"❌ Failed to update crew job status: {response.status_code} - {response.text}")
            return False
        
        logger.info(f"✅ Updated crew job {job_id} status to {status}")
        # Publish to Redis for real-time push to WebSocket clients
        try:
            from .redis_client import is_redis_configured, publish_job_update
            if is_redis_configured():
                publish_job_update({
                    "type": "crew_job_update",
                    "job_id": job_id,
                    "status": status,
                    "current_stage": current_stage,
                    "progress": progress,
                    "error_message": error_message,
                })
        except Exception as pub_err:
            logger.debug("Redis publish_job_update (status): %s", pub_err)
        return True
        
    except Exception as e:
        logger.error(f"❌ Error updating crew job status: {e}")
        return False


def complete_crew_job(
    job_id: str,
    result_data: Dict[str, Any],
    pdf_url: Optional[str] = None
) -> bool:
    """
    Mark a SpareFinder Research job as completed with results
    
    Args:
        job_id: UUID of the job
        result_data: Complete analysis results
        pdf_url: URL to the generated PDF report (optional)
        
    Returns:
        bool: True if update successful, False otherwise
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning("Supabase not configured - skipping job completion")
            return False
        
        update_data = {
            'status': 'completed',
            'current_stage': 'completed',
            'progress': 100,
            'result_data': result_data,
            'completed_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if pdf_url:
            update_data['pdf_url'] = pdf_url
        
        url = f"{SUPABASE_URL}/rest/v1/crew_analysis_jobs?id=eq.{job_id}"
        response = requests.patch(url, headers=SUPABASE_HEADERS, json=update_data)
        
        if response.status_code not in [200, 204]:
            # Fallback: minimal update (status + pdf_url) in case result_data is too large or RLS blocks
            logger.warning(f"Full completion PATCH failed ({response.status_code}), retrying with minimal update")
            minimal_data = {
                'status': 'completed',
                'current_stage': 'completed',
                'progress': 100,
                'completed_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
            }
            if pdf_url:
                minimal_data['pdf_url'] = pdf_url
            retry_response = requests.patch(url, headers=SUPABASE_HEADERS, json=minimal_data)
            if retry_response.status_code not in [200, 204]:
                logger.error(f"❌ Failed to complete crew job: {retry_response.status_code} - {retry_response.text}")
                return False
        
        logger.info(f"✅ Completed crew job {job_id}")
        # Publish to Redis for real-time push to WebSocket clients
        try:
            from .redis_client import is_redis_configured, publish_job_update
            if is_redis_configured():
                publish_job_update({
                    "type": "crew_job_update",
                    "job_id": job_id,
                    "status": "completed",
                    "current_stage": "completed",
                    "progress": 100,
                    "pdf_url": pdf_url,
                })
        except Exception as pub_err:
            logger.debug("Redis publish_job_update (complete): %s", pub_err)
        return True
        
    except Exception as e:
        logger.error(f"❌ Error completing crew job: {e}")
        return False


def get_crew_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the status of a crew analysis job from the database.
    
    Args:
        job_id: The job ID to check
        
    Returns:
        dict: Job status information or None if not found
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning("Supabase not configured")
            return None
            
        # Query crew_analysis_jobs table
        url = f"{SUPABASE_URL}/rest/v1/crew_analysis_jobs?id=eq.{job_id}&select=*"
        
        response = requests.get(url, headers=SUPABASE_HEADERS)
        
        if response.status_code != 200:
            logger.error(f"❌ Failed to get job status: {response.status_code} - {response.text}")
            return None
        
        data = response.json()
        
        if not data or len(data) == 0:
            return None
        
        job = data[0]
        
        return {
            "job_id": job.get("id"),
            "status": job.get("status"),
            "progress": job.get("progress"),
            "current_stage": job.get("current_stage"),
            "error_message": job.get("error_message"),
            "result_data": job.get("result_data"),
            "pdf_url": job.get("pdf_url"),
            "created_at": job.get("created_at"),
            "updated_at": job.get("updated_at")
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting job status: {e}")
        return None

