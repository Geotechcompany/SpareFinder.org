"""
Database service for logging AI predictions and user statistics
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import os
import json

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    logging.warning("Supabase client not available - database logging disabled")

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class DatabaseService:
    """Service for logging AI predictions and user statistics to database."""
    
    def __init__(self):
        """Initialize database service."""
        self.supabase_client: Optional[Client] = None
        self.enabled = False
        
        if SUPABASE_AVAILABLE and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
            try:
                self.supabase_client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_KEY
                )
                self.enabled = True
                logger.info("Database service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize database service: {e}")
                self.enabled = False
        else:
            logger.info("Database service disabled - missing configuration")
    
    async def log_prediction(
        self,
        request_id: str,
        user_id: Optional[str] = None,
        image_url: Optional[str] = None,
        image_name: Optional[str] = None,
        predictions: List[Dict] = None,
        confidence_score: float = 0.0,
        processing_time: float = 0.0,
        ai_model_version: str = "Google Vision API v1",
        similar_images: List[Dict] = None,
        web_scraping_used: bool = False,
        sites_searched: int = 0,
        parts_found: int = 0,
        search_query: Optional[str] = None,
        image_size_bytes: Optional[int] = None,
        image_format: Optional[str] = None,
        analysis_status: str = "completed",
        error_message: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Log a prediction result to the database.
        
        Returns:
            bool: True if logging was successful, False otherwise
        """
        if not self.enabled or not self.supabase_client:
            logger.debug("Database logging disabled - skipping prediction log")
            return False
        
        try:
            # Only log if we have a user_id (authenticated request)
            if not user_id:
                logger.debug("No user_id provided - skipping database log")
                return False
            
            log_data = {
                "id": request_id,
                "user_id": user_id,
                "image_url": image_url,
                "image_name": image_name or "unknown.jpg",
                "predictions": predictions or [],
                "confidence_score": confidence_score,
                "processing_time": int(processing_time * 1000),  # Convert to milliseconds
                "ai_model_version": ai_model_version,
                "similar_images": similar_images or [],
                "web_scraping_used": web_scraping_used,
                "sites_searched": sites_searched,
                "parts_found": parts_found,
                "search_query": search_query,
                "image_size_bytes": image_size_bytes,
                "image_format": image_format,
                "upload_source": "ai_service",
                "analysis_status": analysis_status,
                "error_message": error_message,
                "metadata": metadata or {}
            }
            
            # Remove None values
            log_data = {k: v for k, v in log_data.items() if v is not None}
            
            logger.info(f"Logging prediction to database: {request_id}")
            
            result = self.supabase_client.table("part_searches").insert(log_data).execute()
            
            if result.data:
                logger.info(f"Successfully logged prediction {request_id} to database")
                
                # Also log search history
                await self._log_search_history(
                    user_id=user_id,
                    part_search_id=request_id,
                    search_type="image_upload",
                    search_query=search_query or image_name,
                    results_count=(len(predictions) if predictions else 0) + (len(similar_images) if similar_images else 0)
                )
                
                return True
            else:
                logger.error(f"Failed to log prediction {request_id} - no data returned")
                return False
                
        except Exception as e:
            logger.error(f"Database logging error for prediction {request_id}: {e}")
            return False
    
    async def _log_search_history(
        self,
        user_id: str,
        part_search_id: str,
        search_type: str = "image_upload",
        search_query: Optional[str] = None,
        results_count: int = 0,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Log search history entry."""
        if not self.enabled or not self.supabase_client:
            return False
        
        try:
            history_data = {
                "user_id": user_id,
                "part_search_id": part_search_id,
                "search_type": search_type,
                "search_query": search_query,
                "results_count": results_count,
                "clicked_results": [],
                "session_id": session_id,
                "ip_address": ip_address,
                "user_agent": user_agent
            }
            
            # Remove None values
            history_data = {k: v for k, v in history_data.items() if v is not None}
            
            result = self.supabase_client.table("user_search_history").insert(history_data).execute()
            
            if result.data:
                logger.debug(f"Successfully logged search history for {part_search_id}")
                return True
            else:
                logger.warning(f"Failed to log search history for {part_search_id}")
                return False
                
        except Exception as e:
            logger.error(f"Search history logging error for {part_search_id}: {e}")
            return False
    
    async def get_user_statistics(self, user_id: str) -> Optional[Dict]:
        """Get user statistics from database."""
        if not self.enabled or not self.supabase_client:
            return None
        
        try:
            result = self.supabase_client.table("user_statistics").select("*").eq("user_id", user_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error getting user statistics for {user_id}: {e}")
            return None
    
    async def update_daily_stats(self, date: str = None) -> bool:
        """Update daily usage statistics."""
        if not self.enabled or not self.supabase_client:
            return False
        
        try:
            if not date:
                date = datetime.now().strftime("%Y-%m-%d")
            
            # This would normally be handled by database triggers,
            # but we can manually update if needed
            logger.debug(f"Daily stats update for {date} handled by database triggers")
            return True
            
        except Exception as e:
            logger.error(f"Error updating daily stats: {e}")
            return False
    
    def is_enabled(self) -> bool:
        """Check if database service is enabled."""
        return self.enabled
    
    async def test_connection(self) -> bool:
        """Test database connection."""
        if not self.enabled or not self.supabase_client:
            return False
        
        try:
            # Try a simple query
            result = self.supabase_client.table("part_searches").select("id").limit(1).execute()
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False


# Global instance
database_service = DatabaseService()


async def log_ai_prediction(
    request_id: str,
    predictions: List[Dict],
    processing_time: float,
    model_version: str = "Google Vision API v1",
    similar_images: List[Dict] = None,
    web_scraping_used: bool = False,
    user_id: Optional[str] = None,
    image_metadata: Optional[Dict] = None,
    **kwargs
) -> bool:
    """
    Convenience function to log AI predictions.
    
    Args:
        request_id: Unique request identifier
        predictions: List of prediction results
        processing_time: Time taken for processing in seconds
        model_version: AI model version used
        similar_images: Similar images found via web scraping
        web_scraping_used: Whether web scraping was used
        user_id: User ID if available
        image_metadata: Additional image metadata
        **kwargs: Additional parameters
    
    Returns:
        bool: True if logging was successful
    """
    if not database_service.is_enabled():
        return False
    
    # Extract metadata
    confidence_score = 0.0
    search_query = None
    
    if predictions and len(predictions) > 0:
        confidence_score = predictions[0].get("confidence", 0.0)
        search_query = predictions[0].get("class_name")
    
    sites_searched = 1 if web_scraping_used else 0
    parts_found = len(similar_images) if similar_images else 0
    
    return await database_service.log_prediction(
        request_id=request_id,
        user_id=user_id,
        predictions=predictions,
        confidence_score=confidence_score,
        processing_time=processing_time,
        ai_model_version=model_version,
        similar_images=similar_images,
        web_scraping_used=web_scraping_used,
        sites_searched=sites_searched,
        parts_found=parts_found,
        search_query=search_query,
        image_size_bytes=image_metadata.get("size_bytes") if image_metadata else None,
        image_format=image_metadata.get("content_type") if image_metadata else None,
        **kwargs
    ) 