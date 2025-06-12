"""
External Part Database API Service
Simplified service with Google Search only - Octopart and Mouser removed for now.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Union, Any
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class PartResult:
    """Standardized part result from external databases."""
    part_number: str
    manufacturer: str
    description: str
    category: str
    specifications: Dict[str, Any]
    availability: Dict[str, Any]
    pricing: List[Dict[str, Any]]
    datasheets: List[str]
    images: List[str]
    supplier: str
    supplier_part_number: Optional[str] = None
    lifecycle_status: Optional[str] = None
    confidence_score: float = 0.0
    last_updated: datetime = None


class ExternalPartAPI:
    """
    Simplified part API service - external APIs temporarily disabled.
    Only uses Google Search for additional context.
    """
    
    def __init__(self):
        logger.info("ExternalPartAPI initialized - external providers disabled")
    
    async def search_part_by_number(
        self, 
        part_number: str, 
        providers: List[str] = None,
        limit: int = 10
    ) -> List[PartResult]:
        """
        Placeholder search by part number - returns empty results.
        External APIs (Octopart, Mouser) temporarily disabled.
        """
        logger.info(f"Part search requested for: {part_number}")
        logger.info("External part databases disabled - returning empty results")
        return []
    
    async def search_part_by_description(
        self, 
        description: str, 
        category: str = None,
        providers: List[str] = None,
        limit: int = 10
    ) -> List[PartResult]:
        """
        Placeholder search by description - returns empty results.
        """
        logger.info(f"Description search requested: {description}")
        logger.info("External part databases disabled - returning empty results")
        return []
    
    async def get_part_details(
        self, 
        part_number: str, 
        manufacturer: str = None,
        provider: str = None
    ) -> Optional[PartResult]:
        """
        Placeholder part details - returns None.
        """
        logger.info(f"Part details requested for: {part_number}")
        logger.info("External part databases disabled - returning None")
        return None
    
    def get_available_providers(self) -> List[str]:
        """Return list of available providers (currently empty)."""
        return []
    
    def is_configured(self) -> bool:
        """Check if any external APIs are configured."""
        return False


# Global instance
external_part_api = ExternalPartAPI() 