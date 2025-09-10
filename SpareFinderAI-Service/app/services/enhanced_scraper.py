import re
import asyncio
import json
from typing import Dict, Any, Optional, List, Set
from urllib.parse import urljoin, urlparse, parse_qs
from dataclasses import dataclass

import aiohttp
from bs4 import BeautifulSoup, Comment
import logging

logger = logging.getLogger(__name__)

@dataclass
class ContactInfo:
    emails: List[str]
    phones: List[str]
    addresses: List[str]
    contact_links: List[str]
    social_media: Dict[str, str]
    business_hours: Optional[str] = None
    support_forms: List[str] = None

@dataclass
class ScrapedData:
    success: bool
    url: str
    title: str
    contact_info: ContactInfo
    price_info: Optional[str]
    company_name: Optional[str]
    description: Optional[str]
    error: Optional[str] = None

class EnhancedSupplierScraper:
    def __init__(self):
        self.session = None
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }
        
        # Common contact page patterns
        self.contact_patterns = [
            r'/contact', r'/contact-us', r'/contactus', r'/contact\.html',
            r'/about', r'/about-us', r'/aboutus', r'/company',
            r'/support', r'/help', r'/customer-service',
            r'/sales', r'/sales-team', r'/sales-inquiry',
            r'/quote', r'/request-quote', r'/get-quote',
            r'/reach-us', r'/get-in-touch', r'/connect'
        ]
        
        # Social media patterns
        self.social_patterns = {
            'facebook': [r'facebook\.com', r'fb\.com'],
            'twitter': [r'twitter\.com', r'x\.com'],
            'linkedin': [r'linkedin\.com'],
            'instagram': [r'instagram\.com'],
            'youtube': [r'youtube\.com', r'youtu\.be'],
            'whatsapp': [r'whatsapp\.com', r'wa\.me']
        }

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers=self.headers,
            timeout=aiohttp.ClientTimeout(total=30),
            connector=aiohttp.TCPConnector(limit=10, limit_per_host=5)
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def fetch_page(self, url: str) -> Optional[str]:
        """Fetch page content with proper error handling"""
        try:
            async with self.session.get(url, allow_redirects=True) as response:
                if response.status >= 200 and response.status < 400:
                    content = await response.text(errors='ignore')
                    return content
                else:
                    logger.warning(f"HTTP {response.status} for {url}")
                    return None
        except asyncio.TimeoutError:
            logger.warning(f"Timeout fetching {url}")
            return None
        except Exception as e:
            logger.warning(f"Error fetching {url}: {e}")
            return None

    def extract_emails(self, text: str) -> Set[str]:
        """Extract email addresses with filtering"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
        emails = set()
        
        for match in re.finditer(email_pattern, text, re.IGNORECASE):
            email = match.group().lower()
            # Filter out common non-business emails
            if not any(skip in email for skip in ['noreply', 'no-reply', 'donotreply', 'example.com', 'test.com']):
                emails.add(email)
        
        return emails

    def extract_phones(self, text: str) -> Set[str]:
        """Extract phone numbers in various formats"""
        phone_patterns = [
            r'\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})',  # US format
            r'\+?[1-9]\d{1,14}',  # International format
            r'\(\d{3}\)\s?\d{3}-\d{4}',  # (123) 456-7890
            r'\d{3}-\d{3}-\d{4}',  # 123-456-7890
            r'\d{3}\.\d{3}\.\d{4}',  # 123.456.7890
        ]
        
        phones = set()
        for pattern in phone_patterns:
            for match in re.finditer(pattern, text):
                phone = re.sub(r'[^\d+]', '', match.group())
                if len(phone) >= 10:  # Minimum valid phone length
                    phones.add(phone)
        
        return phones

    def extract_addresses(self, text: str) -> Set[str]:
        """Extract potential addresses"""
        # Simple address pattern - looks for street numbers followed by street names
        address_pattern = r'\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Place|Pl|Court|Ct)\b'
        addresses = set()
        
        for match in re.finditer(address_pattern, text, re.IGNORECASE):
            address = match.group().strip()
            if len(address) > 10:  # Filter out very short matches
                addresses.add(address)
        
        return addresses

    def extract_contact_links(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """Extract contact-related links"""
        contact_links = set()
        
        for link in soup.find_all('a', href=True):
            href = link.get('href', '').strip()
            text = link.get_text().strip().lower()
            
            # Check if link text suggests contact info
            contact_keywords = ['contact', 'support', 'sales', 'help', 'about', 'quote', 'inquiry']
            if any(keyword in text for keyword in contact_keywords):
                full_url = urljoin(base_url, href)
                contact_links.add(full_url)
            
            # Check if URL path suggests contact page
            for pattern in self.contact_patterns:
                if re.search(pattern, href, re.IGNORECASE):
                    full_url = urljoin(base_url, href)
                    contact_links.add(full_url)
        
        return list(contact_links)

    def extract_social_media(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract social media links"""
        social_links = {}
        
        for link in soup.find_all('a', href=True):
            href = link.get('href', '').lower()
            
            for platform, patterns in self.social_patterns.items():
                for pattern in patterns:
                    if re.search(pattern, href):
                        social_links[platform] = link.get('href')
                        break
        
        return social_links

    def extract_business_hours(self, text: str) -> Optional[str]:
        """Extract business hours information"""
        hours_patterns = [
            r'(?:hours?|business\s+hours?)[:\s]*([^.!?]*(?:am|pm|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[^.!?]*)',
            r'(?:open|closed)[:\s]*([^.!?]*(?:am|pm|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[^.!?]*)',
        ]
        
        for pattern in hours_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None

    def extract_company_name(self, soup: BeautifulSoup, url: str) -> Optional[str]:
        """Extract company name from various sources"""
        # Try title tag first
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text().strip()
            # Clean up common title suffixes
            title = re.sub(r'\s*[-|]\s*(home|contact|about|welcome).*$', '', title, flags=re.IGNORECASE)
            if title and len(title) > 3:
                return title
        
        # Try h1 tag
        h1_tag = soup.find('h1')
        if h1_tag:
            h1_text = h1_tag.get_text().strip()
            if h1_text and len(h1_text) > 3:
                return h1_text
        
        # Try meta description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            desc = meta_desc.get('content').strip()
            # Extract first few words as potential company name
            words = desc.split()[:5]
            if words:
                return ' '.join(words)
        
        # Fallback to domain name
        domain = urlparse(url).netloc
        if domain:
            return domain.replace('www.', '').split('.')[0].title()
        
        return None

    def extract_price_info(self, text: str) -> Optional[str]:
        """Extract pricing information"""
        price_patterns = [
            r'\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$[\d,]+(?:\.\d{2})?)?',  # $100 - $200
            r'USD\s*[\d,]+(?:\.\d{2})?',  # USD 100
            r'price[:\s]*\$?[\d,]+(?:\.\d{2})?',  # Price: $100
            r'starting\s+at\s*\$?[\d,]+(?:\.\d{2})?',  # Starting at $100
        ]
        
        prices = []
        for pattern in price_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            prices.extend(matches)
        
        if prices:
            # Return unique prices, limited to 5
            unique_prices = list(dict.fromkeys(prices))[:5]
            return ', '.join(unique_prices)
        
        return None

    def clean_text(self, soup: BeautifulSoup) -> str:
        """Extract clean text content from HTML"""
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
        
        # Remove comments
        comments = soup.findAll(text=lambda text: isinstance(text, Comment))
        for comment in comments:
            comment.extract()
        
        # Get text and clean it up
        text = soup.get_text()
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        return text

    async def scrape_supplier_page(self, url: str) -> ScrapedData:
        """Main scraping method"""
        try:
            # Fetch the page
            html_content = await self.fetch_page(url)
            if not html_content:
                return ScrapedData(
                    success=False,
                    url=url,
                    title="",
                    contact_info=ContactInfo([], [], [], [], {}),
                    price_info=None,
                    company_name=None,
                    description=None,
                    error="Failed to fetch page"
                )
            
            # Parse HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            text_content = self.clean_text(soup)
            
            # Extract title
            title_tag = soup.find('title')
            title = title_tag.get_text().strip() if title_tag else ""
            
            # Extract contact information
            emails = list(self.extract_emails(text_content))
            phones = list(self.extract_phones(text_content))
            addresses = list(self.extract_addresses(text_content))
            contact_links = self.extract_contact_links(soup, url)
            social_media = self.extract_social_media(soup)
            business_hours = self.extract_business_hours(text_content)
            
            # Extract other information
            company_name = self.extract_company_name(soup, url)
            price_info = self.extract_price_info(text_content)
            
            # Create description from meta description or first paragraph
            description = None
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                description = meta_desc.get('content').strip()
            else:
                # Try to get first meaningful paragraph
                paragraphs = soup.find_all('p')
                for p in paragraphs:
                    text = p.get_text().strip()
                    if len(text) > 50:  # Meaningful length
                        description = text[:200] + "..." if len(text) > 200 else text
                        break
            
            contact_info = ContactInfo(
                emails=emails,
                phones=phones,
                addresses=addresses,
                contact_links=contact_links,
                social_media=social_media,
                business_hours=business_hours,
                support_forms=[]
            )
            
            return ScrapedData(
                success=True,
                url=url,
                title=title,
                contact_info=contact_info,
                price_info=price_info,
                company_name=company_name,
                description=description
            )
            
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            return ScrapedData(
                success=False,
                url=url,
                title="",
                contact_info=ContactInfo([], [], [], [], {}),
                price_info=None,
                company_name=None,
                description=None,
                error=str(e)
            )

    async def scrape_multiple_suppliers(self, urls: List[str]) -> List[ScrapedData]:
        """Scrape multiple supplier pages concurrently"""
        tasks = [self.scrape_supplier_page(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append(ScrapedData(
                    success=False,
                    url=urls[i],
                    title="",
                    contact_info=ContactInfo([], [], [], [], {}),
                    price_info=None,
                    company_name=None,
                    description=None,
                    error=str(result)
                ))
            else:
                processed_results.append(result)
        
        return processed_results

# Convenience function for backward compatibility
async def scrape_supplier_page(url: str) -> Dict[str, Any]:
    """Legacy function for backward compatibility"""
    async with EnhancedSupplierScraper() as scraper:
        result = await scraper.scrape_supplier_page(url)
        
        return {
            "success": result.success,
            "url": result.url,
            "title": result.title,
            "company_name": result.company_name,
            "description": result.description,
            "contact": {
                "emails": result.contact_info.emails,
                "phones": result.contact_info.phones,
                "addresses": result.contact_info.addresses,
                "contact_links": result.contact_info.contact_links,
                "social_media": result.contact_info.social_media,
                "business_hours": result.contact_info.business_hours
            },
            "price_info": result.price_info,
            "error": result.error
        }

# Enhanced function for multiple suppliers
async def scrape_multiple_suppliers(urls: List[str]) -> List[Dict[str, Any]]:
    """Scrape multiple supplier pages and return structured data"""
    async with EnhancedSupplierScraper() as scraper:
        results = await scraper.scrape_multiple_suppliers(urls)
        
        return [
            {
                "success": result.success,
                "url": result.url,
                "title": result.title,
                "company_name": result.company_name,
                "description": result.description,
                "contact": {
                    "emails": result.contact_info.emails,
                    "phones": result.contact_info.phones,
                    "addresses": result.contact_info.addresses,
                    "contact_links": result.contact_info.contact_links,
                    "social_media": result.contact_info.social_media,
                    "business_hours": result.contact_info.business_hours
                },
                "price_info": result.price_info,
                "error": result.error
            }
            for result in results
        ]
