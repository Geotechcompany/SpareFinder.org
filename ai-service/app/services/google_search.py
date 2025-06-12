import asyncio
import logging
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class GoogleSearchService:
    """Google Custom Search API integration for automotive part information."""
    
    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY
        self.search_engine_id = settings.GOOGLE_SEARCH_ENGINE_ID
        self.base_url = "https://www.googleapis.com/customsearch/v1"
        self.timeout = 10  # seconds
        self.daily_quota = 100  # Google CSE free tier limit
    
    def is_configured(self) -> bool:
        """Check if Google Search is properly configured."""
        return bool(self.api_key and self.search_engine_id)
    
    async def search_automotive_part(
        self, 
        part_name: str, 
        category: str = None,
        limit: int = 3
    ) -> Dict[str, Any]:
        """
        Search for automotive part information using Google Custom Search.
        
        Args:
            part_name: The predicted part name from AI
            category: Optional part category to refine search
            limit: Maximum number of search results to process
            
        Returns:
            Dict containing enhanced part information
        """
        if not self.is_configured():
            logger.warning("Google Search API not configured")
            return {}
        
        try:
            # Build search query
            search_query = self._build_search_query(part_name, category)
            logger.info(f"Searching Google for: {search_query}")
            
            # Perform search
            search_results = await self._perform_search(search_query, limit)
            
            # Extract and process results
            enhanced_info = await self._extract_part_information(search_results, part_name)
            
            return enhanced_info
            
        except Exception as e:
            logger.error(f"Google Search failed for {part_name}: {e}")
            return {}
    
    def _build_search_query(self, part_name: str, category: str = None) -> str:
        """Build optimized search query for automotive parts."""
        # Clean part name
        clean_name = part_name.replace("_", " ").strip()
        
        # Base query with automotive context
        query_parts = ["automotive", clean_name]
        
        # Add category if provided
        if category and category.lower() != "general":
            query_parts.append(category.lower())
        
        # Add specific search terms for better results
        query_parts.extend([
            "part", "OEM", "replacement", 
            "specifications", "part number"
        ])
        
        # Build final query (limit length for API)
        query = " ".join(query_parts)
        if len(query) > 200:
            query = query[:200].rsplit(" ", 1)[0]  # Truncate at word boundary
        
        return query
    
    async def _perform_search(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Perform the actual Google Custom Search API call."""
        params = {
            "key": self.api_key,
            "cx": self.search_engine_id,
            "q": query,
            "num": min(limit, 10),  # Google CSE max is 10 per request
            "safe": "active",
            "fields": "items(title,link,snippet,pagemap)"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.base_url,
                params=params,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("items", [])
            elif response.status_code == 429:
                logger.warning("Google Search API quota exceeded")
                return []
            else:
                logger.error(f"Google Search API error: {response.status_code}")
                return []
    
    async def _extract_part_information(
        self, 
        search_results: List[Dict[str, Any]], 
        part_name: str
    ) -> Dict[str, Any]:
        """Extract useful automotive part information from search results."""
        enhanced_info = {
            "description": None,
            "manufacturer": None,
            "part_numbers": [],
            "compatibility": [],
            "price_range": None,
            "sources": []
        }
        
        for result in search_results:
            try:
                title = result.get("title", "")
                snippet = result.get("snippet", "")
                link = result.get("link", "")
                
                # Extract information from title and snippet
                self._extract_description(enhanced_info, title, snippet, part_name)
                self._extract_manufacturer(enhanced_info, title, snippet)
                self._extract_part_numbers(enhanced_info, title, snippet)
                self._extract_compatibility(enhanced_info, title, snippet)
                self._extract_price_info(enhanced_info, title, snippet)
                
                # Store source
                enhanced_info["sources"].append({
                    "title": title,
                    "url": link,
                    "snippet": snippet[:200] + "..." if len(snippet) > 200 else snippet
                })
                
            except Exception as e:
                logger.warning(f"Error processing search result: {e}")
                continue
        
        # Clean up and validate extracted information
        self._clean_extracted_info(enhanced_info)
        
        return enhanced_info
    
    def _extract_description(self, info: Dict, title: str, snippet: str, part_name: str):
        """Extract part description from search results."""
        # Prefer snippets that mention the part name
        text = f"{title} {snippet}".lower()
        part_lower = part_name.lower().replace("_", " ")
        
        if part_lower in text and not info["description"]:
            # Use snippet as description if it's relevant
            clean_snippet = snippet.replace("...", "").strip()
            if len(clean_snippet) > 20 and len(clean_snippet) < 300:
                info["description"] = clean_snippet
    
    def _extract_manufacturer(self, info: Dict, title: str, snippet: str):
        """Extract manufacturer information."""
        text = f"{title} {snippet}".lower()
        
        # Common automotive manufacturers
        manufacturers = [
            "bosch", "denso", "continental", "delphi", "valeo", "magna", 
            "borg warner", "schaeffler", "mahle", "tenneco", "federal mogul",
            "toyota", "honda", "ford", "gm", "general motors", "chrysler",
            "bmw", "mercedes", "audi", "volkswagen", "nissan", "hyundai",
            "acdelco", "motorcraft", "mopar", "genuine", "oem"
        ]
        
        for manufacturer in manufacturers:
            if manufacturer in text and not info["manufacturer"]:
                info["manufacturer"] = manufacturer.title()
                break
    
    def _extract_part_numbers(self, info: Dict, title: str, snippet: str):
        """Extract part numbers from search results."""
        import re
        text = f"{title} {snippet}"
        
        # Pattern for automotive part numbers
        part_number_patterns = [
            r'\b[A-Z]{2,4}[-\s]?\d{4,8}[-\s]?[A-Z]?\b',  # Standard format
            r'\b\d{4,6}[-\s]?\d{2,4}[-\s]?\d{2,4}\b',     # Numeric format
            r'\b[A-Z]\d{6,10}\b',                          # Alphanumeric
        ]
        
        for pattern in part_number_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                clean_match = match.strip().upper()
                if clean_match not in info["part_numbers"] and len(clean_match) >= 5:
                    info["part_numbers"].append(clean_match)
    
    def _extract_compatibility(self, info: Dict, title: str, snippet: str):
        """Extract vehicle compatibility information."""
        text = f"{title} {snippet}".lower()
        
        # Common vehicle makes and models
        vehicle_keywords = [
            "toyota camry", "honda accord", "ford f-150", "chevrolet silverado",
            "bmw 3 series", "mercedes c-class", "audi a4", "volkswagen golf",
            "nissan altima", "hyundai elantra", "kia optima", "mazda cx-5"
        ]
        
        for vehicle in vehicle_keywords:
            if vehicle in text:
                if vehicle not in [c.lower() for c in info["compatibility"]]:
                    info["compatibility"].append(vehicle.title())
    
    def _extract_price_info(self, info: Dict, title: str, snippet: str):
        """Extract price information."""
        import re
        text = f"{title} {snippet}"
        
        # Price patterns
        price_patterns = [
            r'[\$£€]\s*\d{1,4}(?:\.\d{2})?',  # $99.99, £150.00
            r'\d{1,4}(?:\.\d{2})?\s*[\$£€]',  # 99.99$, 150£
        ]
        
        prices = []
        for pattern in price_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                prices.append(match.strip())
        
        if prices and not info["price_range"]:
            info["price_range"] = " - ".join(prices[:2]) if len(prices) > 1 else prices[0]
    
    def _clean_extracted_info(self, info: Dict):
        """Clean and validate extracted information."""
        # Limit array sizes
        info["part_numbers"] = info["part_numbers"][:5]
        info["compatibility"] = info["compatibility"][:10]
        info["sources"] = info["sources"][:3]
        
        # Clean description
        if info["description"]:
            info["description"] = info["description"][:500]  # Limit length


# Create global instance
google_search_service = GoogleSearchService() 