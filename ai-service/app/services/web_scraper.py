"""
Web Scraping Service for Automotive Parts Websites
Handles scraping from various automotive parts sites with proper rate limiting and etiquette.
Enhanced with improved image fetching capabilities.
"""

import asyncio
import logging
import random
import re
import base64
import io
import time
import os
from typing import Dict, List, Optional, Any, Tuple
from urllib.parse import urljoin, quote_plus, urlparse
import aiohttp
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
import cloudscraper
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from PIL import Image

logger = logging.getLogger(__name__)


class AutomotivePartsScraper:
    """Advanced web scraper for automotive parts websites with enhanced image fetching."""
    
    def __init__(self):
        """Initialize web scraper with enhanced Chrome WebDriver setup."""
        self.ua = UserAgent()
        self.session = None
        self.scraper = cloudscraper.create_scraper()
        
        # Google Search API configuration
        self.google_api_key = os.getenv('GOOGLE_API_KEY')
        self.google_search_engine_id = os.getenv('GOOGLE_SEARCH_ENGINE_ID')
        self.google_search_enabled = bool(self.google_api_key and self.google_search_engine_id)
        
        if self.google_search_enabled:
            logger.info("Google Search API enabled - will test connection on first use")
        else:
            logger.info("Google Search API not configured - will use direct site scraping only")
        
        # Flag to track if Google API has been tested
        self._google_api_tested = False
        
        # Enhanced Chrome options with maximum stealth
        self.chrome_options = Options()
        self.chrome_options.add_argument('--headless=new')  # New headless mode
        self.chrome_options.add_argument('--no-sandbox')
        self.chrome_options.add_argument('--disable-dev-shm-usage')
        self.chrome_options.add_argument('--disable-gpu')
        self.chrome_options.add_argument('--disable-software-rasterizer')
        self.chrome_options.add_argument('--disable-extensions')
        self.chrome_options.add_argument('--disable-infobars')
        self.chrome_options.add_argument('--disable-notifications')
        self.chrome_options.add_argument('--disable-popup-blocking')
        self.chrome_options.add_argument('--window-size=1920,1080')
        self.chrome_options.add_argument('--ignore-certificate-errors')
        self.chrome_options.add_argument('--allow-running-insecure-content')
        self.chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        self.chrome_options.add_argument('--disable-web-security')
        self.chrome_options.add_argument('--disable-features=VizDisplayCompositor')
        self.chrome_options.add_argument('--disable-ipc-flooding-protection')
        
        # Additional stealth arguments
        self.chrome_options.add_argument('--disable-background-timer-throttling')
        self.chrome_options.add_argument('--disable-backgrounding-occluded-windows')
        self.chrome_options.add_argument('--disable-renderer-backgrounding')
        self.chrome_options.add_argument('--disable-features=TranslateUI')
        self.chrome_options.add_argument('--disable-default-apps')
        self.chrome_options.add_argument('--no-first-run')
        self.chrome_options.add_argument('--no-default-browser-check')
        self.chrome_options.add_argument('--disable-logging')
        self.chrome_options.add_argument('--disable-plugins')
        self.chrome_options.add_argument('--disable-hang-monitor')
        self.chrome_options.add_argument('--disable-prompt-on-repost')
        
        # More realistic user agents with latest versions
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
        ]
        self.chrome_options.add_argument(f'--user-agent={random.choice(user_agents)}')
        
        # Enhanced Chrome preferences for maximum stealth
        self.chrome_options.add_experimental_option('excludeSwitches', ['enable-logging', 'enable-automation'])
        self.chrome_options.add_experimental_option('useAutomationExtension', False)
        self.chrome_options.add_experimental_option("prefs", {
            "profile.default_content_setting_values.notifications": 2,
            "profile.managed_default_content_settings.images": 1,
            "profile.default_content_settings.cookies": 1,
            "profile.default_content_settings.popups": 0,
            "profile.managed_default_content_settings.popups": 0,
            "profile.default_content_settings.geolocation": 2,
            "profile.default_content_settings.media_stream": 2,
            "profile.managed_default_content_settings.media_stream": 2
        })
        
        # Initialize Chrome WebDriver with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                self.driver = webdriver.Chrome(options=self.chrome_options)
                logger.info("Chrome WebDriver initialized successfully")
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"Failed to initialize Chrome WebDriver after {max_retries} attempts: {e}")
                    raise
                logger.warning(f"Chrome WebDriver initialization attempt {attempt + 1} failed: {e}")
                time.sleep(2 ** attempt)  # Exponential backoff
        
        # Reduced delays for easy sites only
        self.base_delays = {
            'easy': (1, 3),      # Fast scraping for easy sites only
        }
        
        # eBay UK only - most reliable and best results
        self.retry_strategies = {
            'ebay.co.uk': 'default'                  # Best results site
        }
        
        # Focus only on eBay UK - best results for automotive parts
        self.site_configs = {
            'ebay.co.uk': {
                'difficulty': 'easy',
                'search_url': 'https://www.ebay.co.uk/sch/i.html?_nkw={query}&_sacat=9889&_sop=15&_ipg=60',
                'selectors': {
                    'items': '.s-item',
                    'title': '.s-item__title, .s-item__title-text',
                    'price': '.s-item__price, .notranslate',
                    'link': '.s-item__link, a[href*="itm"]',
                    'image': '.s-item__image img, .s-item__wrapper img, img[src*="ebayimg"]',
                    'condition': '.s-item__subtitle, .s-item__condition',
                    'shipping': '.s-item__shipping, .s-item__logisticsCost',
                    'part_number': '.s-item__subtitle',
                    'brand': '.s-item__subtitle'
                }
            }
        }
        
        # No backup sites needed - eBay UK has excellent coverage
    
    async def search_parts(self, part_name: str, max_sites: int = 5) -> List[Dict[str, Any]]:
        """Search for automotive parts across multiple websites."""
        logger.info(f"Starting part search for: {part_name}")
        
        results = []
        
        # Start with Google Search if enabled
        if self.google_search_enabled:
            google_results = await self._search_google(part_name)
            if google_results:
                results.extend(google_results)
                logger.info(f"Found {len(google_results)} results from Google Search")
        
        # Then search our predefined automotive sites
        site_results = await self._search_automotive_sites(part_name, max_sites)
        if site_results:
            results.extend(site_results)
        
        # Log comprehensive scraping results
        logger.info(f"Real scraping completed with {len(results)} results from actual websites")
        
        # Log success rates by site
        if site_results:
            successful_sites = set()
            for result in site_results:
                if result.get('source'):
                    successful_sites.add(result['source'])
            
            total_attempted = len(self._select_sites_for_search(max_sites))
            success_rate = (len(successful_sites) / total_attempted * 100) if total_attempted > 0 else 0
            
            logger.info(f"Site scraping success rate: {success_rate:.1f}% ({len(successful_sites)}/{total_attempted} sites)")
            logger.info(f"Successful sites: {', '.join(sorted(successful_sites))}")
        
        # Log Google Search contribution if enabled
        if self.google_search_enabled:
            google_count = len([r for r in results if r.get('source', '').startswith('google')])
            site_count = len(results) - google_count
            logger.info(f"Results breakdown: {google_count} from Google Search, {site_count} from direct scraping")
        
        # Deduplicate and rank results
        cleaned_results = self._clean_and_rank_results(results)
        
        # Enhance with image validation and processing
        enhanced_results = await self._enhance_results_with_images(cleaned_results)
        
        logger.info(f"Search completed. Found {len(enhanced_results)} total results")
        return enhanced_results[:20]  # Return top 20 results
    
    def _select_sites_for_search(self, max_sites: int) -> List[str]:
        """Select only easy sites for reliable scraping."""
        # Only use easy sites
        easy_sites = [site for site, config in self.site_configs.items() 
                     if config['difficulty'] == 'easy']
        
        # Shuffle for variety
        random.shuffle(easy_sites)
        
        # Return all easy sites up to max_sites limit
        return easy_sites[:max_sites]
    
    async def _search_site_with_retry(self, site: str, part_name: str, max_retries: int = 3) -> List[Dict[str, Any]]:
        """Search a site with enhanced retry logic and fallback methods."""
        config = self.site_configs.get(site)
        if not config:
            logger.warning(f"No configuration found for site: {site}")
            return []
        
        # Check if site has specific retry strategy
        strategy = self.retry_strategies.get(site, 'default')
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Searching {site} for {part_name} (attempt {attempt + 1}, strategy: {strategy})")
                
                # Apply site-specific strategy
                if strategy == 'selenium_only':
                    results = await self._search_with_selenium(site, part_name)
                elif strategy == 'selenium_with_delay':
                    # Extra delay for problematic sites
                    await asyncio.sleep(random.uniform(3, 7))
                    results = await self._search_with_selenium(site, part_name)
                elif strategy == 'http_with_retry':
                    # Try HTTP first, then Selenium
                    results = await self._search_with_http(site, part_name)
                    if not results and attempt == max_retries - 1:
                        logger.info(f"HTTP failed for {site}, trying Selenium as fallback")
                        results = await self._search_with_selenium(site, part_name)
                else:
                    # Default strategy - all sites are easy now
                    results = await self._search_with_http(site, part_name)
                    # Fallback to Selenium if HTTP fails
                    if not results and attempt == max_retries - 1:
                        logger.info(f"HTTP failed for {site}, trying Selenium fallback")
                        results = await self._search_with_selenium(site, part_name)
                
                if results:
                    logger.info(f"Successfully scraped {len(results)} results from {site}")
                    return results
                else:
                    logger.warning(f"No results from {site} on attempt {attempt + 1}")
                    
            except Exception as e:
                logger.error(f"Error scraping {site} (attempt {attempt + 1}): {e}")
            
            # Progressive wait time with jitter
            if attempt < max_retries - 1:
                base_wait = 2 ** attempt
                jitter = random.uniform(1, 4)
                wait_time = base_wait + jitter
                logger.info(f"Waiting {wait_time:.1f}s before retry for {site}")
                await asyncio.sleep(wait_time)
        
        logger.warning(f"Failed to scrape {site} after {max_retries} attempts")
        return []
    
    async def _search_with_http(self, site: str, part_name: str) -> List[Dict[str, Any]]:
        """Search using HTTP requests (for easy/moderate sites)."""
        config = self.site_configs[site]
        
        # Build search URL
        query = quote_plus(part_name.replace('_', ' '))
        search_url = config['search_url'].format(query=query)
        
        # Simple, eBay-friendly headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-GB,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        
        # Add respectful delay
        delay_range = self.base_delays[config['difficulty']]
        await asyncio.sleep(random.uniform(*delay_range))
        
        try:
            html = None
            max_attempts = 3
            
            # Method 1: Simple aiohttp request (no complex configurations)
            try:
                # Simple, reliable connector configuration
                connector = aiohttp.TCPConnector(ssl=False)  # Disable SSL verification for simplicity
                timeout = aiohttp.ClientTimeout(total=30)
                
                async with aiohttp.ClientSession(
                    headers=headers, 
                    connector=connector, 
                    timeout=timeout
                ) as session:
                    async with session.get(search_url, allow_redirects=True) as response:
                        if response.status == 200:
                            html = await response.text()
                            logger.info(f"Successfully fetched {len(html)} chars from {site} via aiohttp")
                        else:
                            logger.warning(f"HTTP {response.status} from {site}")
                            html = None
                            
            except Exception as aiohttp_error:
                logger.warning(f"Aiohttp failed for {site}: {aiohttp_error}")
                html = None
            
            # Method 2: Try with cloudscraper if aiohttp failed
            if not html or len(html) < 500:
                try:
                    logger.info(f"Trying cloudscraper for {site}")
                    # Add extra delay for cloudscraper
                    await asyncio.sleep(random.uniform(3, 7))
                    
                    # Create new scraper instance with better headers
                    scraper = cloudscraper.create_scraper(
                        browser={
                            'browser': 'chrome',
                            'platform': 'windows',
                            'mobile': False
                        }
                    )
                    
                    response = scraper.get(search_url, headers=headers, timeout=45, allow_redirects=True)
                    if response.status_code == 200:
                        html = response.text
                        logger.info(f"Successfully fetched {len(html)} chars from {site} via cloudscraper")
                    elif response.status_code == 403:
                        logger.warning(f"Cloudscraper returned 403 for {site}")
                    elif response.status_code == 404:
                        logger.warning(f"Cloudscraper returned 404 for {site}")
                    else:
                        logger.warning(f"Cloudscraper returned {response.status_code} for {site}")
                except Exception as cloudscraper_error:
                    logger.warning(f"Cloudscraper failed for {site}: {cloudscraper_error}")
            
            # Check if we got valid HTML
            if not html or len(html) < 500:
                logger.warning(f"No valid HTML content from {site}")
                return []
                
            # Simplified anti-bot detection (less strict for eBay)
            html_lower = html.lower()
            critical_patterns = [
                'captcha', 'blocked', 'access denied', 
                'verification required', 'suspicious activity'
            ]
            
            # Only block if we see critical patterns, not just "robot" mentions
            if any(pattern in html_lower for pattern in critical_patterns):
                logger.warning(f"Critical anti-bot protection detected on {site}")
                return []
            
            # Check if page has actual content (eBay listings)
            if 's-item' not in html and 'product' not in html_lower:
                logger.warning(f"No product listings found on {site} - possible blocking")
                return []
            
            # Check for empty or error pages
            if len(html.strip()) < 1000:
                logger.warning(f"Received suspiciously short response from {site}: {len(html)} chars")
                return []
            
            # Parse results
            results = self._parse_search_results(html, site, config)
            if results:
                logger.info(f"Successfully parsed {len(results)} results from {site}")
            else:
                logger.warning(f"No results parsed from {site} HTML")
            
            return results
            
        except Exception as e:
            error_msg = str(e)
            # Enhanced error categorization and logging
            if 'brotli' in error_msg.lower() or 'br' in error_msg.lower():
                logger.warning(f"HTTP compression error for {site}: {error_msg}")
            elif 'ssl' in error_msg.lower() or 'certificate' in error_msg.lower():
                logger.warning(f"SSL/Certificate error for {site}: {error_msg}")
            elif 'timeout' in error_msg.lower() or 'timed out' in error_msg.lower():
                logger.warning(f"Timeout error for {site}: {error_msg}")
            elif 'connection' in error_msg.lower():
                logger.warning(f"Connection error for {site}: {error_msg}")
            elif 'forbidden' in error_msg.lower() or '403' in error_msg:
                logger.warning(f"Access forbidden for {site}: {error_msg}")
            elif 'not found' in error_msg.lower() or '404' in error_msg:
                logger.warning(f"Page not found for {site}: {error_msg}")
            elif 'rate limit' in error_msg.lower() or '429' in error_msg:
                logger.warning(f"Rate limited by {site}: {error_msg}")
            else:
                logger.warning(f"HTTP request failed for {site}: {error_msg}")
            
            # Log additional context for debugging
            logger.debug(f"Failed URL for {site}: {search_url}")
            logger.debug(f"User-Agent used: {headers.get('User-Agent', 'Unknown')}")
            
            return []
    
    async def _search_with_selenium(self, site: str, part_name: str) -> List[Dict[str, Any]]:
        """Search using Selenium (for difficult sites with JavaScript)."""
        config = self.site_configs[site]
        results = []
        
        try:
            # Build search URL
            query = quote_plus(part_name.replace('_', ' '))
            search_url = config['search_url'].format(query=query)
            
            # Add stealth modifications to the driver
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            self.driver.execute_script("window.chrome = {runtime: {}}")
            self.driver.execute_script("Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']})")
            self.driver.execute_script("Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]})")
            
            # Set longer timeouts for problematic sites
            page_timeout = 30 if site in ['rockauto.com', 'carid.com', 'partsgeek.com'] else 20
            self.driver.set_page_load_timeout(page_timeout)
            
            # Navigate with retry logic
            max_nav_attempts = 3
            for nav_attempt in range(max_nav_attempts):
                try:
                    logger.info(f"Navigating to {search_url} (attempt {nav_attempt + 1})")
                    self.driver.get(search_url)
                    break
                except Exception as nav_error:
                    if nav_attempt == max_nav_attempts - 1:
                        logger.error(f"Failed to navigate to {site} after {max_nav_attempts} attempts: {nav_error}")
                        return []
                    logger.warning(f"Navigation attempt {nav_attempt + 1} failed for {site}: {nav_error}")
                    await asyncio.sleep(random.uniform(2, 5))
            
            # Wait for content with explicit timeout and fallback selectors
            wait_timeout = 15 if site in ['rockauto.com', 'carid.com', 'partsgeek.com'] else 10
            
            try:
                wait = WebDriverWait(self.driver, wait_timeout)
                
                # Try primary selector first
                try:
                    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, config['selectors']['items'])))
                except TimeoutException:
                    # Try fallback selectors for common elements
                    fallback_selectors = [
                        '.product', '.item', '.result', '.listing',
                        '[class*="product"]', '[class*="item"]', '[class*="result"]'
                    ]
                    
                    content_found = False
                    for fallback in fallback_selectors:
                        try:
                            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, fallback)))
                            logger.info(f"Found content using fallback selector '{fallback}' for {site}")
                            content_found = True
                            break
                        except TimeoutException:
                            continue
                    
                    if not content_found:
                        logger.warning(f"Timeout waiting for content on {site}")
                        return []
                        
            except TimeoutException:
                logger.warning(f"Timeout waiting for content on {site}")
                return []
            
            # Additional wait for JavaScript to load
            await asyncio.sleep(random.uniform(2, 5))
            
            # Check if we're blocked or redirected
            current_url = self.driver.current_url
            if 'captcha' in current_url.lower() or 'blocked' in current_url.lower():
                logger.warning(f"Detected captcha/block page on {site}")
                return []
            
            # Get page source and parse
            html = self.driver.page_source
            
            # Enhanced anti-bot detection for Selenium
            html_lower = html.lower()
            selenium_anti_bot_patterns = [
                'access denied', 'blocked', 'captcha', 'challenge',
                'please verify', 'security check', 'unusual traffic',
                'cloudflare', 'ddos protection', 'bot detection'
            ]
            
            if any(pattern in html_lower for pattern in selenium_anti_bot_patterns):
                logger.warning(f"Anti-bot protection detected on {site} via Selenium")
                return []
            
            results = self._parse_search_results(html, site, config)
            
            # Clear browser data for next request
            try:
                self.driver.delete_all_cookies()
                self.driver.execute_script("window.localStorage.clear();")
                self.driver.execute_script("window.sessionStorage.clear();")
            except Exception as cleanup_error:
                logger.debug(f"Browser cleanup error for {site}: {cleanup_error}")
            
        except Exception as e:
            logger.error(f"Selenium search failed for {site}: {e}")
            # Attempt to recover the driver
            try:
                self.driver.quit()
                self.driver = webdriver.Chrome(options=self.chrome_options)
            except Exception:
                logger.error("Failed to recover Chrome WebDriver")
        
        return results
    
    def _parse_search_results(self, html: str, site: str, config: Dict) -> List[Dict[str, Any]]:
        """Parse HTML search results using BeautifulSoup with enhanced image extraction and filtering."""
        soup = BeautifulSoup(html, 'lxml')
        selectors = config['selectors']
        
        items = soup.select(selectors['items'])
        results = []
        
        logger.info(f"Found {len(items)} potential items from {site}")
        
        for item in items[:15]:  # Process more items to get better results after filtering
            try:
                # Extract basic information with multiple selector fallbacks
                title_elem = None
                for title_selector in selectors['title'].split(', '):
                    title_elem = item.select_one(title_selector.strip())
                    if title_elem:
                        break
                
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                
                # Filter out generic or non-automotive results
                if self._is_generic_result(title):
                    continue
                
                # Extract price with fallbacks
                price = 'N/A'
                price_elem = None
                for price_selector in selectors['price'].split(', '):
                    price_elem = item.select_one(price_selector.strip())
                    if price_elem:
                        price = price_elem.get_text(strip=True)
                        break
                
                # Extract link with fallbacks
                link = ''
                link_elem = None
                for link_selector in selectors['link'].split(', '):
                    link_elem = item.select_one(link_selector.strip())
                    if link_elem:
                        link = link_elem.get('href', '')
                        break
                
                # Make link absolute
                if link and not link.startswith('http'):
                    if link.startswith('//'):
                        link = 'https:' + link
                    elif link.startswith('/'):
                        link = f"https://{site}{link}"
                    else:
                        link = f"https://{site}/{link}"
                
                # Extract additional data if available
                part_number = ''
                brand = ''
                condition = ''
                shipping = ''
                
                if 'part_number' in selectors:
                    pn_elem = item.select_one(selectors['part_number'])
                    if pn_elem:
                        part_number_text = pn_elem.get_text(strip=True)
                        # Extract part number patterns
                        import re
                        part_match = re.search(r'[A-Z0-9]{3,}[-]?[A-Z0-9]{3,}', part_number_text)
                        if part_match:
                            part_number = part_match.group()
                
                if 'brand' in selectors:
                    brand_elem = item.select_one(selectors['brand'])
                    if brand_elem:
                        brand_text = brand_elem.get_text(strip=True)
                        # Extract known automotive brands
                        automotive_brands = ['BMW', 'Mercedes', 'Audi', 'Ford', 'Toyota', 'Honda', 'Nissan', 'Volkswagen', 'Peugeot', 'Renault', 'Vauxhall', 'Volvo']
                        for auto_brand in automotive_brands:
                            if auto_brand.lower() in brand_text.lower():
                                brand = auto_brand
                                break
                
                if 'condition' in selectors:
                    cond_elem = item.select_one(selectors['condition'])
                    condition = cond_elem.get_text(strip=True) if cond_elem else ''
                
                if 'shipping' in selectors:
                    ship_elem = item.select_one(selectors['shipping'])
                    shipping = ship_elem.get_text(strip=True) if ship_elem else ''
                
                # Enhanced image extraction
                image_urls = self._extract_image_urls(item, selectors, site)
                primary_image_url = image_urls[0] if image_urls else ''
                
                # Clean price
                price_cleaned = self._extract_price(price)
                
                # Calculate relevance score
                relevance_score = self._calculate_relevance_score(title, part_number)
                
                # Only include results with reasonable relevance and valid data
                if relevance_score > 0.3 and title and len(title) > 5:
                    # Format price with British Pounds
                    price_display = f"£{price_cleaned:.2f}" if price_cleaned > 0 else "Price not available"
                    
                    result = {
                        'title': title,
                        'price': price_display,
                        'raw_price': price,
                        'link': link,
                        'source': site,
                        'part_number': part_number,
                        'brand': brand,
                        'condition': condition,
                        'shipping': shipping,
                        'image_url': primary_image_url,
                        'additional_images': image_urls[1:5] if len(image_urls) > 1 else [],
                        'image_count': len(image_urls),
                        'relevance_score': relevance_score
                    }
                    
                    results.append(result)
                
            except Exception as e:
                logger.warning(f"Error parsing item from {site}: {e}")
                continue
        
        logger.info(f"Successfully parsed {len(results)} valid results from {site}")
        return results
    
    def _is_generic_result(self, title: str) -> bool:
        """Filter out generic or non-automotive results."""
        if not title or len(title) < 5:
            return True
        
        title_lower = title.lower()
        
        # Generic patterns to exclude
        generic_patterns = [
            'shop on ebay',
            'ebay',
            'advertisement',
            'sponsored',
            'see more',
            'view all',
            'related searches',
            'did you mean',
            'suggestions'
        ]
        
        for pattern in generic_patterns:
            if pattern in title_lower:
                return True
        
        return False
    
    def _extract_image_urls(self, item: BeautifulSoup, selectors: Dict, site: str) -> List[str]:
        """Extract and validate image URLs from a search result item."""
        image_urls = []
        
        # Primary image selector
        if 'image' in selectors:
            img_elements = item.select(selectors['image'])
            for img in img_elements:
                url = self._get_image_url_from_element(img, site)
                if url and self._is_valid_image_url(url):
                    image_urls.append(url)
        
        # Fallback image selector
        if not image_urls and 'image_fallback' in selectors:
            img_elements = item.select(selectors['image_fallback'])
            for img in img_elements:
                url = self._get_image_url_from_element(img, site)
                if url and self._is_valid_image_url(url):
                    image_urls.append(url)
        
        # Generic fallback - look for any images
        if not image_urls:
            img_elements = item.select('img[src], img[data-src], img[data-lazy-src]')
            for img in img_elements:
                url = self._get_image_url_from_element(img, site)
                if url and self._is_valid_image_url(url):
                    image_urls.append(url)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_urls = []
        for url in image_urls:
            if url not in seen:
                seen.add(url)
                unique_urls.append(url)
        
        return unique_urls[:10]  # Limit to 10 images max
    
    def _get_image_url_from_element(self, img_element: BeautifulSoup, site: str) -> Optional[str]:
        """Extract image URL from an img element with various src attributes."""
        # Try different possible src attributes
        for attr in ['src', 'data-src', 'data-lazy-src', 'data-original', 'data-url']:
            url = img_element.get(attr, '').strip()
            if url:
                # Handle relative URLs
                if url.startswith('//'):
                    url = 'https:' + url
                elif url.startswith('/'):
                    url = f"https://{site}{url}"
                elif not url.startswith('http'):
                    url = f"https://{site}/{url}"
                
                return url
        
        return None
    
    def _is_valid_image_url(self, url: str) -> bool:
        """Validate if URL looks like a valid image URL."""
        if not url:
            return False
        
        # Check for common image extensions
        image_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp')
        url_lower = url.lower()
        
        # Direct extension check
        if any(url_lower.endswith(ext) for ext in image_extensions):
            return True
        
        # Check for image-related keywords in URL
        image_keywords = ['image', 'img', 'photo', 'picture', 'thumb', 'product']
        if any(keyword in url_lower for keyword in image_keywords):
            return True
        
        # Exclude obvious non-image URLs
        exclude_keywords = ['javascript:', 'data:text', 'mailto:', 'tel:', '.css', '.js']
        if any(keyword in url_lower for keyword in exclude_keywords):
            return False
        
        # Basic URL validation
        try:
            parsed = urlparse(url)
            return bool(parsed.netloc)
        except:
            return False
    
    async def _enhance_results_with_images(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enhance results with image validation and metadata."""
        enhanced_results = []
        
        for result in results:
            try:
                # Validate and enhance primary image
                if result.get('image_url'):
                    image_info = await self._validate_and_enhance_image(result['image_url'])
                    if image_info['is_valid']:
                        result.update({
                            'image_valid': True,
                            'image_metadata': image_info['metadata'],
                            'image_similarity_score': image_info.get('similarity_score', 0.0)
                        })
                    else:
                        result['image_valid'] = False
                
                # Validate and enhance additional images
                valid_additional = []
                if result.get('additional_images'):
                    for img_url in result['additional_images']:
                        image_info = await self._validate_and_enhance_image(img_url)
                        if image_info['is_valid']:
                            valid_additional.append({
                                'url': img_url,
                                'metadata': image_info['metadata'],
                                'similarity_score': image_info.get('similarity_score', 0.0)
                            })
                
                # Sort additional images by similarity score
                valid_additional.sort(key=lambda x: x['similarity_score'], reverse=True)
                result['additional_images'] = valid_additional[:5]  # Keep top 5 most similar images
                result['additional_images_count'] = len(valid_additional)
                
                enhanced_results.append(result)
                
            except Exception as e:
                logger.warning(f"Error enhancing result with images: {e}")
                result['image_valid'] = False
                enhanced_results.append(result)
        
        # Sort results by image similarity score if available
        enhanced_results.sort(
            key=lambda x: (
                x.get('image_similarity_score', 0.0),
                x.get('relevance_score', 0.0)
            ),
            reverse=True
        )
        
        return enhanced_results

    async def _validate_and_enhance_image(self, url: str) -> Dict[str, Any]:
        """Validate and enhance image with metadata and similarity scoring."""
        result = {
            'is_valid': False,
            'metadata': {},
            'similarity_score': 0.0
        }
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                async with session.head(url) as response:
                    if response.status != 200:
                        return result
                    
                    # Check content type
                    content_type = response.headers.get('content-type', '').lower()
                    if not content_type.startswith('image/'):
                        return result
                    
                    # Get basic metadata
                    result['metadata'] = {
                        'content_type': content_type,
                        'size': int(response.headers.get('content-length', 0)),
                        'last_modified': response.headers.get('last-modified', ''),
                    }
                    
                    # Only proceed with full download if image is reasonable size
                    if result['metadata']['size'] > 10 * 1024 * 1024:  # 10MB limit
                        return result
                    
                    # Download image for detailed analysis
                    async with session.get(url) as img_response:
                        if img_response.status != 200:
                            return result
                        
                        image_data = await img_response.read()
                        
                        # Analyze image
                        try:
                            img = Image.open(io.BytesIO(image_data))
                            
                            # Update metadata
                            result['metadata'].update({
                                'width': img.width,
                                'height': img.height,
                                'format': img.format,
                                'mode': img.mode,
                                'aspect_ratio': round(img.width / img.height, 2)
                            })
                            
                            # Calculate similarity score based on image properties
                            # Higher scores for:
                            # - Reasonable dimensions (not too small or large)
                            # - Common image formats
                            # - Appropriate aspect ratio for car parts
                            # - Clear, high-quality images
                            
                            score = 0.5  # Base score
                            
                            # Dimension score
                            if 200 <= img.width <= 2000 and 200 <= img.height <= 2000:
                                score += 0.1
                            
                            # Format score
                            if img.format.lower() in ['jpeg', 'png', 'webp']:
                                score += 0.1
                            
                            # Aspect ratio score (prefer roughly square images)
                            aspect_ratio = img.width / img.height
                            if 0.7 <= aspect_ratio <= 1.3:
                                score += 0.1
                            
                            # Quality score (basic check for bit depth and color mode)
                            if img.mode in ['RGB', 'RGBA'] and getattr(img, 'bits', 8) >= 8:
                                score += 0.1
                            
                            result['similarity_score'] = min(score, 1.0)
                            result['is_valid'] = True
                            
                        except Exception as e:
                            logger.warning(f"Error analyzing image: {e}")
                            return result
                        
        except Exception as e:
            logger.warning(f"Error validating image URL {url}: {e}")
        
        return result
    
    async def download_image(self, url: str, max_size_mb: int = 5) -> Optional[bytes]:
        """Download an image from URL with size limits."""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        return None
                    
                    content_type = response.headers.get('content-type', '')
                    if not content_type.startswith('image/'):
                        return None
                    
                    content_length = response.headers.get('content-length')
                    if content_length and int(content_length) > max_size_mb * 1024 * 1024:
                        logger.warning(f"Image too large: {content_length} bytes")
                        return None
                    
                    image_data = await response.read()
                    
                    # Final size check
                    if len(image_data) > max_size_mb * 1024 * 1024:
                        logger.warning(f"Downloaded image too large: {len(image_data)} bytes")
                        return None
                    
                    return image_data
                    
        except Exception as e:
            logger.error(f"Failed to download image from {url}: {e}")
            return None
    
    async def get_image_as_base64(self, url: str, max_size_mb: int = 5) -> Optional[str]:
        """Download image and return as base64 string."""
        image_data = await self.download_image(url, max_size_mb)
        if image_data:
            return base64.b64encode(image_data).decode('utf-8')
        return None
    
    def _extract_price(self, price_text: str) -> float:
        """Extract numeric price from price text."""
        if not price_text or price_text == 'N/A':
            return 0.0
        
        # Remove currency symbols and extract numbers
        price_match = re.search(r'[\d,]+\.?\d*', price_text.replace(',', ''))
        if price_match:
            try:
                return float(price_match.group())
            except ValueError:
                return 0.0
        
        return 0.0
    
    def _calculate_relevance_score(self, title: str, part_number: str) -> float:
        """Calculate relevance score based on title and part number with enhanced automotive detection."""
        if not title or len(title) < 5:
            return 0.0
            
        score = 0.3  # Base score for valid titles
        title_lower = title.lower()
        
        # High-value automotive keywords
        high_value_keywords = [
            'brake', 'engine', 'filter', 'belt', 'pump', 'sensor', 'valve', 'gasket', 
            'bearing', 'clutch', 'transmission', 'suspension', 'exhaust', 'radiator',
            'alternator', 'starter', 'ignition', 'fuel', 'oil', 'cooling', 'timing',
            'turbo', 'intercooler', 'manifold', 'throttle', 'injector', 'spark plug',
            'door handle', 'headlight', 'taillight', 'mirror', 'bumper', 'fender',
            'wheel', 'tire', 'shock', 'strut', 'spring', 'caliper', 'rotor', 'pad'
        ]
        
        # Car model/brand keywords
        car_keywords = [
            'ford', 'toyota', 'honda', 'nissan', 'bmw', 'mercedes', 'audi', 'volkswagen',
            'peugeot', 'renault', 'vauxhall', 'volvo', 'mazda', 'subaru', 'mitsubishi',
            'focus', 'fiesta', 'corolla', 'civic', 'golf', 'polo', 'passat', '3 series',
            'c class', 'a4', 'a3', 'yaris', 'micra', 'clio', 'megane', 'astra'
        ]
        
        # Quality indicators
        quality_keywords = ['oem', 'genuine', 'original', 'replacement', 'auto', 'car', 'vehicle']
        
        # Count matches
        automotive_matches = sum(1 for keyword in high_value_keywords if keyword in title_lower)
        car_matches = sum(1 for keyword in car_keywords if keyword in title_lower)
        quality_matches = sum(1 for keyword in quality_keywords if keyword in title_lower)
        
        # Boost score based on matches
        score += min(automotive_matches * 0.15, 0.4)  # Up to 0.4 boost for automotive terms
        score += min(car_matches * 0.1, 0.2)  # Up to 0.2 boost for car-specific terms
        score += min(quality_matches * 0.05, 0.15)  # Up to 0.15 boost for quality indicators
        
        # Part number presence and quality
        if part_number and len(part_number) > 3:
            score += 0.2
            # Extra boost for well-formatted part numbers
            import re
            if re.match(r'^[A-Z0-9]{3,}[-]?[A-Z0-9]{3,}$', part_number):
                score += 0.1
        
        # Title quality indicators
        if len(title) > 20:
            score += 0.05
        if len(title) > 40:
            score += 0.05
            
        # Penalize very generic titles
        if len(title.split()) < 3:
            score -= 0.1
            
        return min(max(score, 0.0), 1.0)
    
    def _clean_and_rank_results(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Clean and rank search results."""
        # Remove duplicates based on title similarity
        unique_results = []
        seen_titles = set()
        
        for result in results:
            title_key = result['title'].lower().strip()
            if title_key not in seen_titles and len(title_key) > 5:
                seen_titles.add(title_key)
                unique_results.append(result)
        
        # Sort by relevance score, price availability, and image availability
        def sort_key(item):
            score = item['relevance_score']
            # Handle price comparison safely
            price_value = item.get('price', 0)
            if isinstance(price_value, str):
                # Extract numeric value from price string
                try:
                    price_value = self._extract_price(price_value)
                except:
                    price_value = 0
            has_price = 1 if price_value > 0 else 0
            has_image = 1 if item.get('image_url') else 0
            return (score, has_price, has_image)
        
        return sorted(unique_results, key=sort_key, reverse=True)
    
    async def get_detailed_part_info(self, part_url: str, site: str) -> Dict[str, Any]:
        """Get detailed information from a specific part page including additional images."""
        logger.info(f"Getting detailed info from {part_url}")
        
        headers = {
            'User-Agent': self.ua.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        try:
            async with aiohttp.ClientSession(headers=headers, timeout=aiohttp.ClientTimeout(total=20)) as session:
                async with session.get(part_url) as response:
                    if response.status != 200:
                        return {}
                    
                    html = await response.text()
                    return await self._parse_part_details(html, site)
                    
        except Exception as e:
            logger.warning(f"Failed to get detailed info from {part_url}: {e}")
            return {}
    
    async def _parse_part_details(self, html: str, site: str) -> Dict[str, Any]:
        """Parse detailed part information from product page including all images."""
        soup = BeautifulSoup(html, 'lxml')
        details = {}
        
        try:
            # Extract specifications table
            spec_table = soup.find('table', class_=re.compile(r'spec|detail|feature'))
            if spec_table:
                specs = {}
                for row in spec_table.find_all('tr'):
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:
                        key = cells[0].get_text(strip=True)
                        value = cells[1].get_text(strip=True)
                        specs[key] = value
                details['specifications'] = specs
            
            # Extract description
            desc_elem = soup.find(['div', 'section'], class_=re.compile(r'description|detail|about'))
            if desc_elem:
                details['description'] = desc_elem.get_text(strip=True)[:500]
            
            # Extract all images from product page
            all_images = []
            
            # Look for image galleries, sliders, etc.
            gallery_selectors = [
                '.product-images img', '.image-gallery img', '.product-gallery img',
                '.images img', '.photos img', '.pictures img',
                '.carousel img', '.slider img', '.thumbnails img',
                'img[src*="product"]', 'img[src*="part"]', 'img[src*="item"]'
            ]
            
            for selector in gallery_selectors:
                for img in soup.select(selector):
                    url = self._get_image_url_from_element(img, site)
                    if url and self._is_valid_image_url(url) and url not in all_images:
                        all_images.append(url)
            
            details['all_images'] = all_images[:20]  # Limit to 20 images
            details['image_count'] = len(all_images)
            
            # Get primary image (usually the first or largest)
            if all_images:
                details['primary_image'] = all_images[0]
                details['additional_images'] = all_images[1:10]  # Up to 9 additional
            
        except Exception as e:
            logger.warning(f"Error parsing details: {e}")
        
        return details

    async def _search_google(self, part_name: str) -> List[Dict[str, Any]]:
        """Search for automotive parts using Google Custom Search API."""
        if not self.google_api_key or not self.google_search_engine_id:
            logger.warning("Google Search API credentials not configured")
            return []
        
        # Test Google API on first use
        if not self._google_api_tested:
            await self._test_google_search_api()
            self._google_api_tested = True
            
        try:
            # Construct enhanced search queries for automotive parts
            search_queries = [
                f"{part_name} automotive part OEM replacement",
                f"{part_name} car part specifications price",
                f'"{part_name}" auto parts genuine aftermarket'
            ]
            
            all_results = []
            
            for query in search_queries[:2]:  # Use first 2 queries to avoid quota limits
                try:
                    # Build the Google Search API URL
                    url = "https://www.googleapis.com/customsearch/v1"
                    params = {
                        'key': self.google_api_key,
                        'cx': self.google_search_engine_id,
                        'q': query,
                        'num': 5,  # Reduced to manage quota
                        'fields': 'items(title,link,snippet,pagemap)',
                        'safe': 'off',
                        'lr': 'lang_en'
                    }
                    
                    # Add timeout and better error handling
                    timeout = aiohttp.ClientTimeout(total=15)
                    async with aiohttp.ClientSession(timeout=timeout) as session:
                        async with session.get(url, params=params) as response:
                            if response.status == 403:
                                logger.warning("Google Search API quota exceeded or access denied")
                                break
                            elif response.status == 400:
                                logger.warning("Google Search API bad request - check configuration")
                                break
                            elif response.status != 200:
                                logger.warning(f"Google Search API error: {response.status}")
                                continue
                            
                            data = await response.json()
                            
                            # Check for API errors
                            if 'error' in data:
                                logger.error(f"Google Search API error: {data['error']}")
                                continue
                                
                            if 'items' not in data:
                                logger.info(f"No Google Search results for query: {query}")
                                continue
                            
                            logger.info(f"Google Search found {len(data['items'])} results for: {query}")
                            
                            for item in data['items']:
                                try:
                                    # Extract structured data if available
                                    product_data = self._extract_product_data(item)
                                    
                                    # Format price with British Pounds
                                    price_value = product_data.get('price', 0.0)
                                    price_display = f"£{price_value:.2f}" if price_value > 0 else "Price not available"
                                    
                                    # Create result entry
                                    result = {
                                        'title': item.get('title', ''),
                                        'link': item.get('link', ''),
                                        'description': item.get('snippet', ''),
                                        'source': 'google_search',
                                        'price': price_display,
                                        'raw_price': product_data.get('price_text', 'N/A'),
                                        'brand': product_data.get('brand', ''),
                                        'part_number': product_data.get('mpn', ''),
                                        'image_url': product_data.get('image', ''),
                                        'additional_images': product_data.get('additional_images', []),
                                        'image_count': len(product_data.get('additional_images', [])) + (1 if product_data.get('image') else 0),
                                        'relevance_score': self._calculate_google_relevance(item, part_name)
                                    }
                                    
                                    all_results.append(result)
                                    
                                except Exception as e:
                                    logger.warning(f"Error processing Google Search result: {e}")
                                    continue
                        
                        # Small delay between queries to be respectful
                        await asyncio.sleep(0.5)
                        
                except aiohttp.ClientError as e:
                    logger.warning(f"Network error in Google Search: {e}")
                    continue
                except asyncio.TimeoutError:
                    logger.warning("Google Search request timed out")
                    continue
            
            # Remove duplicates based on URL
            seen_urls = set()
            unique_results = []
            for result in all_results:
                url = result.get('link', '')
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    unique_results.append(result)
            
            logger.info(f"Google Search completed with {len(unique_results)} unique results")
            return unique_results[:10]  # Return top 10 results
                    
        except Exception as e:
            logger.error(f"Google Search API error: {e}")
            return []

    def _extract_product_data(self, search_item: Dict) -> Dict[str, Any]:
        """Extract structured product data from Google Search result."""
        data = {}
        
        # Try to extract from pagemap
        pagemap = search_item.get('pagemap', {})
        
        # Look for product information in multiple formats
        product_sources = ['product', 'offer', 'listitem']
        for source in product_sources:
            if source in pagemap and pagemap[source]:
                product = pagemap[source][0]
                
                # Extract brand information
                if not data.get('brand'):
                    data['brand'] = product.get('brand', '') or product.get('manufacturer', '')
                
                # Extract part number/model
                if not data.get('mpn'):
                    data['mpn'] = product.get('mpn', '') or product.get('model', '') or product.get('sku', '')
                
                # Extract price information
                if not data.get('price_text'):
                    price_fields = ['price', 'lowprice', 'highprice', 'pricecurrency']
                    for field in price_fields:
                        if field in product and product[field]:
                            data['price_text'] = str(product[field])
                            break
        
        # Extract price from snippet if not found in structured data
        if not data.get('price_text'):
            snippet = search_item.get('snippet', '')
            price_patterns = [
                r'\$[\d,]+\.?\d*',  # $123.45
                r'USD\s*[\d,]+\.?\d*',  # USD 123.45
                r'Price:\s*\$?[\d,]+\.?\d*',  # Price: $123.45
                r'[\d,]+\.?\d*\s*dollars?',  # 123.45 dollars
            ]
            for pattern in price_patterns:
                match = re.search(pattern, snippet, re.IGNORECASE)
                if match:
                    data['price_text'] = match.group()
                    break
        
        # Try to extract numeric price
        if data.get('price_text'):
            # Clean price text and extract number
            price_text = data['price_text'].replace(',', '').replace('$', '').replace('USD', '').strip()
            price_match = re.search(r'[\d]+\.?\d*', price_text)
            if price_match:
                try:
                    data['price'] = float(price_match.group())
                except ValueError:
                    pass
        
        # Look for images in multiple sources
        image_sources = ['cse_image', 'metatags', 'imageobject']
        for source in image_sources:
            if source in pagemap and pagemap[source]:
                if source == 'cse_image':
                    data['image'] = pagemap[source][0].get('src', '')
                elif source == 'metatags':
                    # Look for og:image or twitter:image
                    meta = pagemap[source][0]
                    data['image'] = meta.get('og:image', '') or meta.get('twitter:image', '')
                elif source == 'imageobject':
                    data['image'] = pagemap[source][0].get('url', '')
                
                if data.get('image'):
                    break
        
        # Look for additional images
        additional_images = []
        if 'cse_thumbnail' in pagemap:
            additional_images.extend([img.get('src') for img in pagemap['cse_thumbnail'] if img.get('src')])
        
        if 'imageobject' in pagemap:
            additional_images.extend([img.get('url') for img in pagemap['imageobject'] if img.get('url')])
        
        # Remove duplicates and filter valid URLs
        seen_images = set()
        if data.get('image'):
            seen_images.add(data['image'])
            
        unique_additional = []
        for img_url in additional_images:
            if img_url and img_url not in seen_images and self._is_valid_image_url(img_url):
                seen_images.add(img_url)
                unique_additional.append(img_url)
        
        data['additional_images'] = unique_additional[:5]  # Limit to 5 additional images
        
        return data

    def _calculate_google_relevance(self, item: Dict, part_name: str) -> float:
        """Calculate relevance score for Google Search results."""
        score = 0.5  # Base score
        
        # Check title relevance
        title = item.get('title', '').lower()
        part_terms = part_name.lower().split()
        
        # Boost score for each matching term in title
        for term in part_terms:
            if term in title:
                score += 0.1
        
        # Boost score for automotive keywords
        automotive_keywords = ['oem', 'genuine', 'replacement', 'auto', 'car', 'vehicle']
        for keyword in automotive_keywords:
            if keyword in title:
                score += 0.05
        
        # Boost score for price presence
        if 'pagemap' in item and 'product' in item['pagemap']:
            product = item['pagemap']['product'][0]
            if 'price' in product:
                score += 0.1
            if 'mpn' in product:
                score += 0.1
        
        return min(score, 1.0)

    async def _search_automotive_sites(self, part_name: str, max_sites: int) -> List[Dict[str, Any]]:
        """Search automotive parts websites."""
        # Select sites to search (prioritize easy ones)
        sites_to_search = self._select_sites_for_search(max_sites * 2)  # Get more sites for fallback
        
        successful_sites = 0
        results = []
        
        for site in sites_to_search:
            if successful_sites >= max_sites:
                break
            
            try:
                # Add delay between searches
                if results:
                    delay = random.uniform(1, 3)
                    await asyncio.sleep(delay)
                
                # Try HTTP search first
                site_results = await self._search_with_http(site, part_name)
                
                # If HTTP fails with 403, try Selenium
                if not site_results and site in ['carid.com', 'rockauto.com', 'partsgeek.com']:
                    logger.info(f"Retrying {site} with Selenium after HTTP failure")
                    site_results = await self._search_with_selenium(site, part_name)
                
                if site_results:
                    results.extend(site_results)
                    successful_sites += 1
                    logger.info(f"Successfully scraped {site}")
                
            except Exception as e:
                logger.warning(f"Search failed for {site}: {e}")
                continue
        
        return results

    async def _test_google_search_api(self):
        """Test Google Search API connectivity and configuration."""
        try:
            await asyncio.sleep(1)  # Small delay to let initialization complete
            
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'key': self.google_api_key,
                'cx': self.google_search_engine_id,
                'q': 'brake pad test',
                'num': 1,
                'fields': 'searchInformation'
            }
            
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if 'searchInformation' in data:
                            logger.info("✅ Google Search API test successful")
                        else:
                            logger.warning("⚠️ Google Search API test returned unexpected format")
                    elif response.status == 403:
                        logger.error("❌ Google Search API test failed: Access denied (check API key and quotas)")
                    elif response.status == 400:
                        logger.error("❌ Google Search API test failed: Bad request (check search engine ID)")
                    else:
                        logger.error(f"❌ Google Search API test failed: HTTP {response.status}")
                        
        except Exception as e:
            logger.error(f"❌ Google Search API test failed: {e}")

    async def initialize(self):
        """Initialize the automotive parts scraper."""
        logger.info("AutomotivePartsScraper initialized")
        return True
    
    async def search_automotive_part(self, part_name: str) -> List[Dict[str, Any]]:
        """Search for automotive parts - alias for search_parts."""
        return await self.search_parts(part_name, max_sites=1)  # Only eBay UK
    
    async def cleanup(self):
        """Cleanup automotive parts scraper resources."""
        try:
            if hasattr(self, 'driver') and self.driver:
                self.driver.quit()
            logger.info("AutomotivePartsScraper cleanup completed")
        except Exception as e:
            logger.error(f"Error during AutomotivePartsScraper cleanup: {e}")


# Create WebScraper alias for compatibility
class WebScraper(AutomotivePartsScraper):
    """WebScraper alias for AutomotivePartsScraper for compatibility."""
    
    async def initialize(self):
        """Initialize the web scraper."""
        logger.info("WebScraper initialized")
        return True
    
    async def search_automotive_part(self, part_name: str) -> List[Dict[str, Any]]:
        """Search for automotive parts - alias for search_parts."""
        return await self.search_parts(part_name, max_sites=1)  # Only eBay UK
    
    async def cleanup(self):
        """Cleanup web scraper resources."""
        try:
            if hasattr(self, 'driver') and self.driver:
                self.driver.quit()
            logger.info("WebScraper cleanup completed")
        except Exception as e:
            logger.error(f"Error during WebScraper cleanup: {e}")

# Global instance - will be created lazily to avoid event loop issues
automotive_scraper = None

def get_automotive_scraper():
    """Get or create the global automotive scraper instance."""
    global automotive_scraper
    if automotive_scraper is None:
        automotive_scraper = AutomotivePartsScraper()
    return automotive_scraper 