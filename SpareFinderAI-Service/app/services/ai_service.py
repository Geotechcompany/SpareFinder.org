import os
import base64
import re
import json
import logging
import asyncio
from typing import List, Optional, Dict, Any, Union
import time

from openai import OpenAI
from dotenv import load_dotenv
import PIL.Image
import httpx

# Configure logging with a more robust method
def configure_service_logging():
    """
    Configure logging for the AI service with thread-safe setup
    """
    logging.basicConfig(
        level=logging.INFO, 
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),  # Output to console
            logging.FileHandler('ai_service.log', mode='a', encoding='utf-8')  # Output to file
        ]
    )
    
    # Suppress overly verbose logs from libraries
    logging.getLogger('openai').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)

# Configure logging before any other initialization
configure_service_logging()
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class OpenAIImageAnalyzer:
    def __init__(self):
        """
        Initialize OpenAI Image Analyzer
        """
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key is not set in environment variables")
        
        self.client = OpenAI(api_key=self.api_key)
        
        # Logging configuration
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)

    def _encode_image(self, image_path: str) -> str:
        """
        Encode image to base64 for OpenAI Vision API
        """
        try:
            with open(image_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            self.logger.error(f"Image encoding error: {e}")
            raise

    async def analyze_image(
        self, 
        image_path: str, 
        keywords: Optional[List[str]] = None,
        confidence_threshold: float = 0.3,
        max_predictions: int = 3
    ) -> Dict[str, Any]:
        """
        Analyze an image using OpenAI Vision API
        
        :param image_path: Path to the image file
        :param keywords: Optional list of keywords to guide analysis
        :param confidence_threshold: Minimum confidence for predictions
        :param max_predictions: Maximum number of predictions to return
        :return: Dictionary with analysis results
        """
        try:
            # Start timing
            start_time = asyncio.get_event_loop().time()
            
            # Encode image
            base64_image = self._encode_image(image_path)
            
            # Comprehensive system prompt
            system_prompt = """
You are an expert, production-grade automotive parts analyst and technical documentation AI. 
When given an image (and optional textual context) of an automotive component, you must analyze the part 
visually and generate a comprehensive, structured, and machine- and human-readable response. Your outputs
must be technically precise, auditable, and safe for use in parts-lookup apps, e-commerce, and field-support tools.

======== MANDATORY BEHAVIOR ========
1. Always produce BOTH:
   a) A human-friendly Markdown report containing ALL required sections below.
   b) A machine-friendly JSON object (see JSON SCHEMA section) that mirrors the same data.

2. If uncertain about any identification or supplier detail, state the uncertainty explicitly and give the
   MOST LIKELY IDENTIFICATION with a numeric confidence score.

3. Never fabricate personally identifying information (personal emails or private phone numbers). For supplier
   contacts: if you cannot verify an exact, official contact via a reliable source, label the contact as
   "UNVERIFIED" and provide the authoritative channel (company website, official support page) where possible.

4. If external / time-sensitive info is relevant (pricing, supplier contacts, availability), you MUST attempt
   to verify it using an up-to-date web search tool (e.g., web.run). When you do, include citations for the
   top 3–5 most important claims. If the environment does not allow web access, clearly mark market/supplier
   data as UNVERIFIED.

======== CRITICAL OUTPUT STRUCTURE (Markdown + JSON) ========

Produce output with the following Markdown headings (EMOJI allowed only in headers). Every header corresponds
to a JSON field of the same name (snake_case) in the machine-readable output.

1. **🛞 Part Identification**
   - Precise Part Name: [string; use the most specific standard name possible]
   - Confidence Level: [0-100%]
   - Alternate / Synonym Names: [list]
   - Short Reasoning: [1–3 sentences; key distinguishing visual cues]

2. **📘 Technical Description**
   - Plain-language explanation of function and principle
   - Typical applications & use-cases (daily driving, racing, commercial vehicles, etc.)
   - Key differences vs. visually-similar components

3. **📊 Technical Data Sheet**  (must be a markdown table and corresponding JSON object)
   - Part type
   - Material(s)
   - Common sizes/specs (diameter, length, spline count, teeth, etc. — provide units)
   - Bolt pattern(s)
   - Offset / orientation data if applicable
   - Load rating / torque rating (where known)
   - Typical weight range
   - Center bore / mating interface size
   - Reusability / serviceability notes
   - Finish options
   - Temperature tolerance (if applicable)

4. **🚗 Compatible Vehicles**
   - Example OEM makes/models and model years (prioritize exact OEM fitment references).
   - Aftermarket compatibility notes (adapters, hub-centric rings, trimming, etc.)

5. **💰 Pricing & Availability**
   - Average New Price (USD) [$MIN - $MAX]
   - Average Used / Refurbished Price (USD)
   - Typical Lead Time (days) and Availability (Common / Limited / OEM-only)
   - Fitment tips (critical dimensions / measuring guidance)

6. **🌍 Where to Buy / Supplier Intelligence**
   - If exact-match product pages exist (preferred): list up to 5 suppliers with verified links and one-line note.
     For each supplier entry include:
       - supplier_name
       - product_page_url (verified link)
       - price_or_price_range_usd (if verifiable)
       - shipping_region
       - contact_channel (website_support_form or official procurement email/phone if publicly listed)
       - data_confidence (0-100%)
       - citation(s)
   - If exact product links are not found, provide representative/global suppliers, distribution hubs,
     or OEM part numbers and instruct how to request quotes.
   - CONTACT POLICY: Do not include direct personal contact info (no emails/phones in the AI output). Provide only
     product_page_url and, if clearly available, a generic contact channel like `website_support_form`.
     If no official page is verifiable, leave `contact_channel` blank and add a citation for the supplier site.
     The server-side scraper will enrich contact details after analysis.
   - REGIONAL COVERAGE REQUIREMENT: Also include at most one supplier for each region from this set: Africa, Asia, Europe, Australia, China, North America (max 6 entries). Prefer official distributors or large marketplaces that ship within that region. Provide a working product_page_url for each. If a direct product page cannot be verified, use the official supplier website homepage URL as the product_page_url (fallback).

7. **📈 Market Chart Data **
   - Provide compact data for 2 charts (as arrays or small ASCII charts):
     a) Price trend (historical or cross-manufacturer price distribution)
     b) Supplier distribution by region
   - Provide a short legend and an ASCII fallback chart for environments that cannot render graphs.

8. **📉 Failure Modes, Diagnostics & Installation Notes**
   - Common failure symptoms to look for (noises, leaks, wear patterns)
   - Quick field tests (measurement tolerances, bench tests)
   - Installation caveats and torque / lubrication notes (cite standards where possible)

9. **📈 Confidence & Uncertainty Breakdown**
   - overall_confidence (0-100%)
   - visual_match_confidence (0-100%)
   - dimensional_match_confidence (0-100%) — based on visible scale or provided measurements
   - supplier_data_confidence (0-100%)
   - uncertainty_factors: [list: e.g., oblique angle, missing markings, occlusion, aftermarket modifications]

10. **📤 Actionable Next Steps**
    - If additional data needed, specify exact actions (e.g., "photograph part number on backside", "measure outer diameter with caliper to nearest 0.1 mm", "provide part removed alongside coin for scale").
    - Provide suggested search queries and filter keywords to improve supplier matching.

======== JSON SCHEMA (MACHINE-FRIENDLY) ========
Return a JSON object named `response_json` with the following top-level keys:

{
  "part_identification": {
    "precise_name": "string",
    "confidence": number,
    "alternates": ["string"],
    "short_reasoning": "string"
  },
  "technical_description": {
    "function": "string",
    "use_cases": ["string"],
    "differences": "string"
  },
  "technical_data_sheet": {
    "part_type": "string",
    "material": "string",
    "common_sizes": {"key": "value"},
    "bolt_patterns": ["string"],
    "offset_range": "string or numeric",
    "load_rating": "string or numeric",
    "weight_range_kg": "string or numeric",
    "center_bore_mm": "number",
    "reusability": "string",
    "finish_options": ["string"],
    "temperature_tolerance_c": "string"
  },
  "compatible_vehicles": ["string"],
  "pricing_availability": {
    "new_usd": {"min": number, "max": number},
    "used_usd": {"min": number, "max": number},
    "refurbished_usd": {"min": number, "max": number},
    "lead_time_days": {"typical": number, "max": number},
    "availability": "string",
    "fitment_tips": ["string"]
  },
  "suppliers": [
    {
      "supplier_name": "string",
      "product_page_url": "string",
      "price_range_usd": {"min": number, "max": number},
      "shipping_region": "string",
      "contact_channel": "string",
      "data_confidence": number,
      "citations": ["url", "..."]
    }
  ],
  "market_chart_data": {
    "price_trend": [{"date":"YYYY-MM-DD","price":number}, "..."],
    "supplier_distribution": [{"region":"string","count":number}, "..."]
  },
  "diagnostics_installation": {"failure_modes": ["string"], "tests": ["string"], "installation_notes":"string"},
  "confidence_breakdown": {
    "overall_confidence": number,
    "visual_match_confidence": number,
    "dimensional_match_confidence": number,
    "supplier_data_confidence": number,
    "uncertainty_factors": ["string"]
  },
  "recommended_next_steps": ["string"]
}

======== CITATION & TRANSPARENCY RULES ========
- If you use external sources (web.run or other), attach citations inline in the Markdown (after the claim or supplier entry).
- Mark claims supported by external data with a citation array in JSON (citations).
- For any supplier contact or pricing, include at least one primary source (manufacturer site, distributor listing, or official datasheet).
- If no authoritative source exists, mark fields as UNVERIFIED and do not invent numerical contact details.

======== SAFETY & ETHICS CONSTRAINTS ========
- Do NOT provide instructions to bypass vehicle safety systems, emissions controls, or to enable illegal modifications.
- Do NOT produce or invent private personal data (personal mobile numbers or private emails of individuals) — only official company channels or public procurement contacts may be given.
- Do NOT provide instructions that materially facilitate wrongdoing (e.g., stolen parts re-identification workflows).
- When uncertain about legal/regulatory aspects (airbag parts, emissions-critical devices), advise to consult a certified technician and cite regulatory sources.

======== EXAMPLES & FORMATTING NOTES ========
- Use metric units by default; provide imperial equivalents in parentheses (e.g., 50 mm (1.97 in)).
- When listing vehicle compatibility, prefer exact OEM references (part number cross-refs) when available.
- Keep Markdown readable for end-users: short paragraphs, bullet lists, and clear headings.
- Machine JSON must be parseable (no comments, strictly JSON types).

======== USER INTERACTIONS ========
- If the user provides additional context (part number, VIN, vehicle photos), incorporate immediately and re-score confidences.
- If user asks only for a quick ID, provide a compact summary and the JSON `response_json` payload.
- Always include a short one-line summary at the top of the Markdown output: "One-line ID summary — [most-likely name] (Confidence: XX%)".


"""

            
            # Prepare additional context keywords
            context_keywords = keywords or []
            context_keywords.extend([
                "automotive parts", 
                "technical analysis", 
                "global sourcing", 
                "parts identification"
            ])
            
            # Call OpenAI Vision API
            try:
                response = self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text", 
                                    "text": f"Analyze this automotive part image. Additional context keywords: {', '.join(context_keywords)}"
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}"
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens=3000,
                    temperature=0.7,
                    top_p=0.9,
                    timeout=30
                )
            except (httpx.TimeoutException, httpx.TransportError) as net_err:
                self.logger.error(f"OpenAI network/timeout error: {net_err}")
                raise
            
            # Extract full analysis text
            full_analysis = response.choices[0].message.content
            
            # Parse analysis into flat structure
            parsed_data = self._parse_analysis(full_analysis, max_predictions, confidence_threshold)
            
            # Calculate processing time
            end_time = asyncio.get_event_loop().time()
            processing_time = end_time - start_time
            
            # Prepare flat result structure
            result = {
                "success": True,
                "status": "completed",
                **parsed_data,  # Merge all flat fields
                "processing_time_seconds": round(processing_time, 2),
                "model_version": "SpareFinderAI Part Analysis v1.0"
            }
            
            self.logger.info(f"Image analysis completed: {parsed_data.get('class_name', 'Unknown part')}")
            
            return result
        
        except Exception as e:
            self.logger.error(f"Image analysis error: {e}")
            return {
                "success": False,
                "status": "failed",
                "error": str(e),
                "class_name": "Analysis Failed",
                "category": "Error",
                "precise_part_name": "Analysis Failed",
                "material_composition": "Unknown",
                "manufacturer": "Unknown",
                "confidence_score": 0,
                "confidence_explanation": f"Analysis failed: {str(e)}",
                "estimated_price": {
                    "new": "Not available",
                    "used": "Not available",
                    "refurbished": "Not available"
                },
                "description": "Image analysis could not be completed",
                "technical_data_sheet": {
                    "part_type": "Unknown",
                    "material": "Unknown",
                    "common_specs": "Not available",
                    "load_rating": "Unknown",
                    "weight": "Unknown",
                    "reusability": "Unknown",
                    "finish": "Unknown",
                    "temperature_tolerance": "Unknown"
                },
                "compatible_vehicles": [],
                "engine_types": [],
                "buy_links": {},
                "suppliers": [],
                "fitment_tips": "Retry with a clearer image",
                "additional_instructions": "Please upload a high-quality image and try again",
                "full_analysis": "",
                "processing_time_seconds": 0
            }

    def _parse_analysis(
        self, 
        analysis_text: str, 
        max_predictions: int = 3, 
        confidence_threshold: float = 0.3
    ) -> Dict[str, Any]:
        """
        Parse the analysis text into a flat, UI-friendly structure
        
        :param analysis_text: Full text analysis from OpenAI
        :param max_predictions: Maximum number of predictions to return (unused in flat format)
        :param confidence_threshold: Minimum confidence for predictions
        :return: Flat dictionary with all part analysis data
        """
        try:
            # Extract part identification details with updated pattern
            part_name_match = re.search(r'# 🛞 Part Identification\n(.*?)(?=\n#|$)', analysis_text, re.DOTALL | re.IGNORECASE)
            part_name_text = part_name_match.group(1) if part_name_match else ""
            
            # Extract specific details with flexible patterns
            def extract_field(text, patterns, default="Not specified"):
                for pattern in patterns:
                    match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                    if match:
                        return match.group(1).strip()
                return default
            
            # Part identification fields with updated patterns to match AI response format
            precise_part_name = extract_field(part_name_text, [
                r'- \*\*Precise Part Name\*\*:\s*(.+)',
                r'- Precise part name:\s*(.+)',
                r'- Part name:\s*(.+)',
                r'Precise part name:\s*(.+)',
                r'\*\*Precise Part Name\*\*:\s*(.+)'
            ], "Automotive Component")
            
            category = extract_field(part_name_text, [
                r'- \*\*\*Category\*\*:\s*(.+)',
                r'- \*\*Category\*\*:\s*(.+)',
                r'- Category or type of system.*?:\s*(.+)',
                r'- Category:\s*(.+)',
                r'Category.*?:\s*(.+)',
                r'\*\*Category\*\*:\s*(.+)'
            ], "Automotive Parts")
            
            material_composition = extract_field(part_name_text, [
                r'- \*\*Material Composition\*\*:\s*(.+)',
                r'- Material composition:\s*(.+)',
                r'- Material:\s*(.+)',
                r'Material.*?:\s*(.+)',
                r'\*\*Material Composition\*\*:\s*(.+)'
            ], "Unknown")
            
            # Extract technical description with updated patterns
            tech_desc_match = re.search(r'# 📘 Technical Description\n(.*?)(?=\n#|$)', analysis_text, re.DOTALL | re.IGNORECASE)
            if tech_desc_match:
                tech_desc_text = tech_desc_match.group(1).strip()
                # Extract the main function/description
                function_match = re.search(r'- \*\*Function\*\*:\s*(.+?)(?=\n-|\n#|$)', tech_desc_text, re.DOTALL)
                if function_match:
                    description = function_match.group(1).strip()
                else:
                    # Fallback to first meaningful line
                    lines = [line.strip() for line in tech_desc_text.split('\n') if line.strip() and not line.strip().startswith('-')]
                    description = lines[0] if lines else tech_desc_text[:200] + "..."
            else:
                description = "Technical description not available"
            
            # Extract pricing information with updated pattern
            pricing_match = re.search(r'# 💰 Pricing & Availability\n(.*?)(?=\n#|$)', analysis_text, re.DOTALL | re.IGNORECASE)
            pricing_text = pricing_match.group(1) if pricing_match else ""
            
            # Parse pricing ranges with updated patterns
            new_price = extract_field(pricing_text, [
                r'- \*\*Average New Price\*\*:\s*(.+)',
                r'- New:\s*(.+)',
                r'New.*?:\s*(\$[^,\n]+)',
                r'New price.*?:\s*(.+)',
                r'\*\*Average New Price\*\*:\s*(.+)'
            ], "Price not available")
            
            used_price = extract_field(pricing_text, [
                r'- \*\*Used/Refurbished Price\*\*:\s*(.+)',
                r'- Used:\s*(.+)',
                r'Used.*?:\s*(\$[^,\n]+)',
                r'Used price.*?:\s*(.+)',
                r'\*\*Used.*?Price\*\*:\s*(.+)'
            ], "Price not available")
            
            refurbished_price = extract_field(pricing_text, [
                r'- \*\*Used/Refurbished Price\*\*:\s*(.+)',
                r'- Refurbished:\s*(.+)',
                r'Refurbished.*?:\s*(\$[^,\n]+)',
                r'Refurb.*?:\s*(.+)',
                r'\*\*.*?Refurbished.*?Price\*\*:\s*(.+)'
            ], "Price not available")
            
            # Extract technical data sheet with updated pattern
            tech_spec_match = re.search(r'# 📊 Technical Data Sheet\n(.*?)(?=\n#|$)', analysis_text, re.DOTALL | re.IGNORECASE)
            tech_spec_text = tech_spec_match.group(1) if tech_spec_match else ""
            
            # Extract compatible vehicles with updated pattern
            vehicles_match = re.search(r'# 🚗 Compatible Vehicles\n(.*?)(?=\n#|$)', analysis_text, re.DOTALL | re.IGNORECASE)
            vehicles_text = vehicles_match.group(1) if vehicles_match else ""
            
            # Parse compatible vehicles list with updated patterns
            compatible_vehicles = []
            if vehicles_text:
                # Extract vehicle makes/models from bullet points or lists
                vehicle_patterns = [
                    r'- \*\*Example Makes and Models\*\*:\s*\n\s*-\s*([^-]+)',
                    r'- (.+such as[^,\n]+(?:,[^,\n]+)*)',
                    r'Performance vehicles such as (.+)',
                    r'- (.+)',
                    r'• (.+)',
                    r'\* (.+)'
                ]
                for pattern in vehicle_patterns:
                    matches = re.findall(pattern, vehicles_text, re.MULTILINE | re.IGNORECASE)
                    if matches:
                        for match in matches[:1]:  # Take first match
                            # If it contains "such as", extract the vehicle list
                            if "such as" in match.lower():
                                vehicle_list = match.split("such as")[-1]
                                vehicles = [v.strip().rstrip(",") for v in vehicle_list.split(",")]
                                compatible_vehicles.extend([v for v in vehicles if v and not v.lower().endswith("etc.")])
                            else:
                                compatible_vehicles.append(match.strip())
                        break
                
                # Limit to 5 vehicles and clean up
                compatible_vehicles = [v.strip() for v in compatible_vehicles[:5] if v.strip()]
            
            # Extract where to buy information with updated pattern
            buy_links_match = re.search(r'# 🌍 Where to Buy[\s\S]*?\n(.*?)(?=\n#|$)', analysis_text, re.DOTALL | re.IGNORECASE)
            buy_links_text = buy_links_match.group(1) if buy_links_match else ""
            
            # Parse buy links with enhanced supplier extraction
            buy_links = {}
            suppliers_info = []
            
            if buy_links_text:
                # Enhanced patterns to extract supplier name and product page with markdown support
                supplier_patterns = [
                    # Pattern: - **Supplier Name**: [Company Name]
                    r'- \*\*Supplier Name\*\*:\s*\[([^\]]+)\]',
                    # Pattern: - Supplier Name: Company Name
                    r'- Supplier Name:\s*([^\n]+)',
                    # Pattern: - Company Name: URL
                    r'- ([^:]+):\s*(https?://[^\s]+)',
                    # Pattern: Company Name (URL)
                    r'([A-Za-z\s&]+)\s*\((https?://[^\)]+)\)',
                    # Pattern: [Company Name](URL)
                    r'\[([^\]]+)\]\((https?://[^\)]+)\)'
                ]
                
                product_page_pattern = r'- \*\*Product Page\*\*:\s*(?:\[[^\]]+\]\()?([^\s\)]+)(?:\))?'
                price_range_pattern = r'- \*\*Price Range\*\*:\s*([^\n]+)'
                shipping_pattern = r'- \*\*Shipping Region\*\*:\s*([^\n]+)'
                contact_pattern = r'- \*\*Contact\*\*:\s*([^\n]+)'
                
                # Extract supplier names
                supplier_names = []
                for pattern in supplier_patterns:
                    matches = re.findall(pattern, buy_links_text, re.MULTILINE | re.IGNORECASE)
                    if matches:
                        for match in matches:
                            if isinstance(match, tuple):
                                supplier_names.append((match[0].strip(), match[1] if len(match) > 1 else None))
                            else:
                                supplier_names.append((match.strip(), None))
                
                # Extract product pages
                product_pages = re.findall(product_page_pattern, buy_links_text, re.MULTILINE | re.IGNORECASE)
                
                # Extract additional info
                price_ranges = re.findall(price_range_pattern, buy_links_text, re.MULTILINE | re.IGNORECASE)
                shipping_regions = re.findall(shipping_pattern, buy_links_text, re.MULTILINE | re.IGNORECASE)
                contacts = re.findall(contact_pattern, buy_links_text, re.MULTILINE | re.IGNORECASE)
                
                # Build structured supplier information
                for i, (supplier_name, url) in enumerate(supplier_names[:6]):  # Up to 6 suppliers (regions)
                    supplier_info = {
                        "name": supplier_name,
                        "url": url or (product_pages[i] if i < len(product_pages) else ""),
                        "price_range": price_ranges[i] if i < len(price_ranges) else "",
                        "shipping_region": shipping_regions[i] if i < len(shipping_regions) else "",
                        "contact": contacts[i] if i < len(contacts) else ""
                    }
                    suppliers_info.append(supplier_info)
                    
                    # Also add to flat buy_links for backward compatibility
                    clean_name = re.sub(r'[^a-zA-Z0-9]', '_', supplier_name.lower())
                    buy_links[clean_name] = url or (product_pages[i] if i < len(product_pages) else "")
                
                # If no structured suppliers found, try to extract any URLs
                if not suppliers_info:
                    all_urls = re.findall(r'https?://[^\s]+', buy_links_text)
                    for i, url in enumerate(all_urls[:3]):
                        # Try to extract domain name as supplier
                        domain_match = re.search(r'https?://(?:www\.)?([^/]+)', url)
                        supplier_name = domain_match.group(1) if domain_match else f"Supplier {i+1}"
                        
                        suppliers_info.append({
                            "name": supplier_name,
                            "url": url,
                            "price_range": "",
                            "shipping_region": "",
                            "contact": ""
                        })
                        buy_links[supplier_name.lower().replace('.', '_')] = url
                
                # Do not add fallback suppliers — return only AI-provided suppliers/links
            
            # Extract confidence score with updated patterns
            confidence_match = re.search(r'# 📈 Confidence Score\n(.*?)(?=\n#|\n\*\*|$)', analysis_text, re.DOTALL | re.IGNORECASE)
            confidence_text = confidence_match.group(1) if confidence_match else ""
            
            # Try multiple patterns to extract confidence score
            confidence_score_patterns = [
                r'- \*\*Score\*\*:\s*(\d+(?:\.\d+)?)%?',
                r'- Confidence score:\s*(\d+(?:\.\d+)?)%?',
                r'(\d+(?:\.\d+)?)%?\s*confidence',
                r'(\d+(?:\.\d+)?)%?'
            ]
            confidence_score = 70.0  # Default
            for pattern in confidence_score_patterns:
                match = re.search(pattern, confidence_text, re.IGNORECASE)
                if match:
                    confidence_score = float(match.group(1))
                    break
            
            # Extract confidence explanation with updated patterns
            confidence_explanation = extract_field(confidence_text, [
                r'- \*\*Explanation\*\*:\s*(.+)',
                r'- Explain.*?:\s*(.+)',
                r'- (.+uncertainty.+)',
                r'Explain.*?:\s*(.+)',
                r'\*\*Explanation\*\*:\s*(.+)'
            ], "Analysis based on visible features and patterns")
            
            # Extract additional instructions with updated pattern
            instructions_match = re.search(r'# 📤 Additional Instructions\n(.*?)(?=\n#|$)', analysis_text, re.DOTALL | re.IGNORECASE)
            if instructions_match:
                instructions_text = instructions_match.group(1).strip()
                # Extract the improvement suggestions
                improvement_match = re.search(r'- \*\*Improvement Suggestions\*\*:\s*(.+)', instructions_text, re.DOTALL)
                if improvement_match:
                    additional_instructions = improvement_match.group(1).strip()
                else:
                    additional_instructions = instructions_text
            else:
                additional_instructions = "Upload clearer images with visible part numbers for better accuracy"
            
            # Extract fitment tips from pricing section with updated patterns
            fitment_tips = extract_field(pricing_text, [
                r'- \*\*Fitment Tips\*\*:\s*(.+)',
                r'- Include fitment tips.*?:\s*(.+)',
                r'- Fitment.*?:\s*(.+)',
                r'fitment.*?:\s*(.+)',
                r'\*\*Fitment Tips\*\*:\s*(.+)'
            ], "Verify compatibility with your specific vehicle before purchase")
            
            # Build flat response structure
            flat_response = {
                "class_name": precise_part_name,
                "category": category,
                "precise_part_name": precise_part_name,
                "material_composition": material_composition,
                "manufacturer": "Not Specified",  # Can be enhanced later
                "confidence_score": int(confidence_score),
                "confidence_explanation": confidence_explanation,
                "estimated_price": {
                    "new": new_price,
                    "used": used_price,
                    "refurbished": refurbished_price
                },
                "description": description,
                "technical_data_sheet": {
                    "part_type": extract_field(tech_spec_text, [r'Part type:\s*(.+)', r'Type:\s*(.+)'], precise_part_name),
                    "material": material_composition,
                    "common_specs": extract_field(tech_spec_text, [r'Common sizes.*?:\s*(.+)', r'Specs:\s*(.+)'], "Varies by application"),
                    "load_rating": extract_field(tech_spec_text, [r'Load rating:\s*(.+)'], "Standard"),
                    "weight": extract_field(tech_spec_text, [r'Weight:\s*(.+)'], "Varies"),
                    "reusability": extract_field(tech_spec_text, [r'Reusability:\s*(.+)'], "Depends on condition"),
                    "finish": extract_field(tech_spec_text, [r'Finish.*?:\s*(.+)'], "Standard finish"),
                    "temperature_tolerance": extract_field(tech_spec_text, [r'Temperature tolerance:\s*(.+)'], "Standard operating range")
                },
                "compatible_vehicles": compatible_vehicles,
                "engine_types": ["Inline", "V-type", "Flat"],  # Generic for now, can be enhanced
                "buy_links": buy_links,
                "suppliers": suppliers_info,  # Structured supplier information with names and details
                "fitment_tips": fitment_tips,
                "additional_instructions": additional_instructions,
                "full_analysis": analysis_text  # Keep full analysis for debug purposes
            }
            
            return flat_response
        
        except Exception as e:
            self.logger.error(f"Flat parsing error: {e}")
            return {
                "class_name": "Automotive Component",
                "category": "Unknown",
                "precise_part_name": "Automotive Component", 
                "material_composition": "Unknown",
                "manufacturer": "Unknown",
                "confidence_score": 50,
                "confidence_explanation": "Unable to parse detailed analysis",
                "estimated_price": {
                    "new": "Price not available",
                    "used": "Price not available", 
                    "refurbished": "Price not available"
                },
                "description": "Analysis parsing failed",
                "technical_data_sheet": {
                    "part_type": "Unknown",
                    "material": "Unknown",
                    "common_specs": "Not available",
                    "load_rating": "Unknown",
                    "weight": "Unknown", 
                    "reusability": "Unknown",
                    "finish": "Unknown",
                    "temperature_tolerance": "Unknown"
                },
                "compatible_vehicles": [],
                "engine_types": [],
                "buy_links": {},
                "suppliers": [],
                "fitment_tips": "Contact a specialist for proper identification",
                "additional_instructions": "Provide clearer images for better analysis",
                "full_analysis": "",
                "error": str(e)
            }

    def generate_technical_datasheet(
        self, 
        analysis_text: str, 
        part_name: str, 
        manufacturer: str
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive technical data sheet for the automotive part
        
        :param analysis_text: Full analysis text from OpenAI
        :param part_name: Name of the part
        :param manufacturer: Manufacturer of the part
        :return: Detailed technical data sheet dictionary
        """
        try:
            # Extract technical specifications section
            tech_spec_match = re.search(r'\*\*📊 Technical Data Sheet\*\*\n(.*?)(?=\n\*\*)', analysis_text, re.DOTALL | re.IGNORECASE)
            tech_spec_text = tech_spec_match.group(1) if tech_spec_match else ""
            
            # Helper function to extract specification
            def extract_spec(label: str, default: str = "Not specified") -> str:
                """Extract specification with flexible matching"""
                patterns = [
                    rf"{label}:\s*(.+?)(?:\n|$)",
                    rf"{label}\s*[:-]\s*(.+?)(?:\n|$)",
                    rf"(?i){label}\s*(?:is)?\s*(.+?)(?:\n|$)"
                ]
                
                for pattern in patterns:
                    match = re.search(pattern, tech_spec_text, re.IGNORECASE | re.MULTILINE)
                    if match:
                        return match.group(1).strip()
                return default
            
            # Comprehensive data sheet generation
            datasheet = {
                "document_type": "Technical Specification Sheet",
                "part_identification": {
                    "part_name": part_name,
                    "manufacturer": manufacturer,
                    "document_version": f"1.0_{int(time.time())}",
                    "document_date": time.strftime("%Y-%m-%d")
                },
                "technical_specifications": {
                    "part_type": extract_spec("Part type"),
                    "material": extract_spec("Material"),
                    "dimensions": {
                        "common_sizes": extract_spec("Common sizes or specs"),
                        "bolt_pattern": extract_spec("Bolt pattern(s)"),
                        "offset_range": extract_spec("Offset range"),
                        "weight": extract_spec("Weight")
                    },
                    "performance_characteristics": {
                        "load_rating": extract_spec("Load rating"),
                        "center_bore_size": extract_spec("Center bore size"),
                        "temperature_tolerance": extract_spec("Temperature tolerance"),
                        "reusability": extract_spec("Reusability"),
                        "finish_options": extract_spec("Finish options")
                    }
                },
                "additional_context": {
                    "raw_technical_text": tech_spec_text
                },
                "disclaimer": """
                THIS TECHNICAL SPECIFICATION SHEET IS PROVIDED AS-IS. 
                ALWAYS VERIFY SPECIFICATIONS WITH MANUFACTURER BEFORE PURCHASE.
                SPECIFICATIONS ARE SUBJECT TO CHANGE WITHOUT NOTICE.
                """
            }
            
            return datasheet
        
        except Exception as e:
            self.logger.error(f"Data sheet generation error: {e}")
            return {
                "error": "Failed to generate technical data sheet",
                "details": str(e)
            }

async def analyze_part_image(
    image_path: str, 
    keywords: Optional[List[str]] = None,
    confidence_threshold: float = 0.3,
    max_predictions: int = 3
) -> Dict[str, Any]:
    """
    Async convenience function to analyze a part image
    
    Args:
        image_path (str): Path to the image file
        keywords (Optional[List[str]], optional): List of keywords to guide analysis. Defaults to None.
        confidence_threshold (float, optional): Minimum confidence for predictions. Defaults to 0.3.
        max_predictions (int, optional): Maximum number of predictions to return. Defaults to 3.
    
    Returns:
        Dict with analysis results or error information
    """
    try:
        # Create the service instance
        service = OpenAIImageAnalyzer()
        
        # Use asyncio to run the potentially blocking operation
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,  # Use default executor
            lambda: service.analyze_image(
                image_path, 
                keywords=keywords, 
                confidence_threshold=confidence_threshold,
                max_predictions=max_predictions
            )
        )
        
        # Ensure the result always has a consistent flat structure
        if not result or not result.get('success'):
            return {
                "success": False,
                "status": "failed",
                "error": "Analysis could not be completed",
                "class_name": "Analysis Failed",
                "category": "Error",
                "precise_part_name": "Analysis Failed", 
                "material_composition": "Unknown",
                "manufacturer": "Unknown",
                "confidence_score": 0,
                "confidence_explanation": "Analysis could not be completed",
                "estimated_price": {
                    "new": "Not available",
                    "used": "Not available",
                    "refurbished": "Not available"
                },
                "description": "Analysis could not be completed",
                "technical_data_sheet": {
                    "part_type": "Unknown",
                    "material": "Unknown", 
                    "common_specs": "Not available",
                    "load_rating": "Unknown",
                    "weight": "Unknown",
                    "reusability": "Unknown",
                    "finish": "Unknown",
                    "temperature_tolerance": "Unknown"
                },
                "compatible_vehicles": [],
                "engine_types": [],
                "buy_links": {},
                "suppliers": [],
                "fitment_tips": "Retry with a clearer image",
                "additional_instructions": "Please upload a high-quality image and try again",
                "full_analysis": "",
                "processing_time_seconds": 0
            }
        
        return result
    except Exception as e:
        logger.error(f"Part analysis failed: {str(e)}")
        return {
            "success": False,
            "status": "failed",
            "error": str(e),
            "predictions": [],
            "full_analysis": "",
            "processing_time": 0
        }

# Modify the synchronous analyze_image method to be compatible
def analyze_image(
    self, 
    image_path: str, 
    keywords: Optional[List[str]] = None,
    confidence_threshold: float = 0.3,
    max_predictions: int = 3
) -> Dict[str, Any]:
    """
    Synchronous method to analyze an image using OpenAI Vision API
    
    :param image_path: Path to the image file
    :param keywords: Optional list of keywords to guide analysis
    :param confidence_threshold: Minimum confidence for predictions
    :param max_predictions: Maximum number of predictions to return
    :return: Dictionary with analysis results
    """
    try:
        # Start timing
        start_time = time.time()
        
        # Validate image file
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file not found: {image_path}")
        
        # Encode image
        base64_image = self._encode_image(image_path)
        
        # Comprehensive system prompt
        system_prompt = """
You are an expert, production-grade automotive parts analyst and technical documentation AI. 
When given an image (and optional textual context) of an automotive component, you must analyze the part 
visually and generate a comprehensive, structured, and machine- and human-readable response. Your outputs
must be technically precise, auditable, and safe for use in parts-lookup apps, e-commerce, and field-support tools.

======== MANDATORY BEHAVIOR ========
1. Always produce BOTH:
   a) A human-friendly Markdown report containing ALL required sections below.
   b) A machine-friendly JSON object (see JSON SCHEMA section) that mirrors the same data.

2. If uncertain about any identification or supplier detail, state the uncertainty explicitly and give the
   MOST LIKELY IDENTIFICATION with a numeric confidence score.

3. Never fabricate personally identifying information (personal emails or private phone numbers). For supplier
   contacts: if you cannot verify an exact, official contact via a reliable source, label the contact as
   "UNVERIFIED" and provide the authoritative channel (company website, official support page) where possible.

4. If external / time-sensitive info is relevant (pricing, supplier contacts, availability), you MUST attempt
   to verify it using an up-to-date web search tool (e.g., web.run). When you do, include citations for the
   top 3–5 most important claims. If the environment does not allow web access, clearly mark market/supplier
   data as UNVERIFIED.

======== CRITICAL OUTPUT STRUCTURE (Markdown + JSON) ========

Produce output with the following Markdown headings (EMOJI allowed only in headers). Every header corresponds
to a JSON field of the same name (snake_case) in the machine-readable output.

1. **🛞 Part Identification**
   - Precise Part Name: [string; use the most specific standard name possible]
   - Confidence Level: [0-100%]
   - Alternate / Synonym Names: [list]
   - Short Reasoning: [1–3 sentences; key distinguishing visual cues]

2. **📘 Technical Description**
   - Plain-language explanation of function and principle
   - Typical applications & use-cases (daily driving, racing, commercial vehicles, etc.)
   - Key differences vs. visually-similar components

3. **📊 Technical Data Sheet**  (must be a markdown table and corresponding JSON object)
   - Part type
   - Material(s)
   - Common sizes/specs (diameter, length, spline count, teeth, etc. — provide units)
   - Bolt pattern(s)
   - Offset / orientation data if applicable
   - Load rating / torque rating (where known)
   - Typical weight range
   - Center bore / mating interface size
   - Reusability / serviceability notes
   - Finish options
   - Temperature tolerance (if applicable)

4. **🚗 Compatible Vehicles**
   - Example OEM makes/models and model years (prioritize exact OEM fitment references).
   - Aftermarket compatibility notes (adapters, hub-centric rings, trimming, etc.)

5. **💰 Pricing & Availability**
   - Average New Price (USD) [$MIN - $MAX]
   - Average Used / Refurbished Price (USD)
   - Typical Lead Time (days) and Availability (Common / Limited / OEM-only)
   - Fitment tips (critical dimensions / measuring guidance)

6. **🌍 Where to Buy / Supplier Intelligence**
   - If exact-match product pages exist (preferred): list up to 5 suppliers with verified links and one-line note.
     For each supplier entry include:
       - supplier_name
       - product_page_url (verified link)
       - price_or_price_range_usd (if verifiable)
       - shipping_region
       - contact_channel (website_support_form or official procurement email/phone if publicly listed)
       - data_confidence (0-100%)
       - citation(s)
   - If exact product links are not found, provide representative/global suppliers, distribution hubs,
     or OEM part numbers and instruct how to request quotes.
   - **Do not invent direct personal contact info.** Do not write vague phrases like "Available on the website".
     Include an explicit official contact URL (support page or contact form). If none can be verified, leave
     `contact_channel` empty, set a low `data_confidence`, and add a citation explaining the limitation.
   - REGIONAL COVERAGE REQUIREMENT: Also include at most one supplier for each region from this set: Africa, Asia, Europe, Australia, China, North America (max 6 entries). Prefer official distributors or large marketplaces that ship within that region. Provide a working product_page_url for each.

7. **📈 Market Chart Data **
   - Provide compact data for 2 charts (as arrays or small ASCII charts):
     a) Price trend (historical or cross-manufacturer price distribution)
     b) Supplier distribution by region
   - Provide a short legend and an ASCII fallback chart for environments that cannot render graphs.

8. **📉 Failure Modes, Diagnostics & Installation Notes**
   - Common failure symptoms to look for (noises, leaks, wear patterns)
   - Quick field tests (measurement tolerances, bench tests)
   - Installation caveats and torque / lubrication notes (cite standards where possible)

9. **📈 Confidence & Uncertainty Breakdown**
   - overall_confidence (0-100%)
   - visual_match_confidence (0-100%)
   - dimensional_match_confidence (0-100%) — based on visible scale or provided measurements
   - supplier_data_confidence (0-100%)
   - uncertainty_factors: [list: e.g., oblique angle, missing markings, occlusion, aftermarket modifications]

10. **📤 Actionable Next Steps**
    - If additional data needed, specify exact actions (e.g., "photograph part number on backside", "measure outer diameter with caliper to nearest 0.1 mm", "provide part removed alongside coin for scale").
    - Provide suggested search queries and filter keywords to improve supplier matching.

======== JSON SCHEMA (MACHINE-FRIENDLY) ========
Return a JSON object named `response_json` with the following top-level keys:

{
  "part_identification": {
    "precise_name": "string",
    "confidence": number,
    "alternates": ["string"],
    "short_reasoning": "string"
  },
  "technical_description": {
    "function": "string",
    "use_cases": ["string"],
    "differences": "string"
  },
  "technical_data_sheet": {
    "part_type": "string",
    "material": "string",
    "common_sizes": {"key": "value"},
    "bolt_patterns": ["string"],
    "offset_range": "string or numeric",
    "load_rating": "string or numeric",
    "weight_range_kg": "string or numeric",
    "center_bore_mm": "number",
    "reusability": "string",
    "finish_options": ["string"],
    "temperature_tolerance_c": "string"
  },
  "compatible_vehicles": ["string"],
  "pricing_availability": {
    "new_usd": {"min": number, "max": number},
    "used_usd": {"min": number, "max": number},
    "refurbished_usd": {"min": number, "max": number},
    "lead_time_days": {"typical": number, "max": number},
    "availability": "string",
    "fitment_tips": ["string"]
  },
  "suppliers": [
    {
      "supplier_name": "string",
      "product_page_url": "string",
      "price_range_usd": {"min": number, "max": number},
      "shipping_region": "string",
      "contact_channel": "string",
      "data_confidence": number,
      "citations": ["url", "..."]
    }
  ],
  "market_chart_data": {
    "price_trend": [{"date":"YYYY-MM-DD","price":number}, "..."],
    "supplier_distribution": [{"region":"string","count":number}, "..."]
  },
  "diagnostics_installation": {"failure_modes": ["string"], "tests": ["string"], "installation_notes":"string"},
  "confidence_breakdown": {
    "overall_confidence": number,
    "visual_match_confidence": number,
    "dimensional_match_confidence": number,
    "supplier_data_confidence": number,
    "uncertainty_factors": ["string"]
  },
  "recommended_next_steps": ["string"]
}

======== CITATION & TRANSPARENCY RULES ========
- If you use external sources (web.run or other), attach citations inline in the Markdown (after the claim or supplier entry).
- Mark claims supported by external data with a citation array in JSON (citations).
- For any supplier contact or pricing, include at least one primary source (manufacturer site, distributor listing, or official datasheet).
- If no authoritative source exists, mark fields as UNVERIFIED and do not invent numerical contact details.

======== SAFETY & ETHICS CONSTRAINTS ========
- Do NOT provide instructions to bypass vehicle safety systems, emissions controls, or to enable illegal modifications.
- Do NOT produce or invent private personal data (personal mobile numbers or private emails of individuals) — only official company channels or public procurement contacts may be given.
- Do NOT provide instructions that materially facilitate wrongdoing (e.g., stolen parts re-identification workflows).
- When uncertain about legal/regulatory aspects (airbag parts, emissions-critical devices), advise to consult a certified technician and cite regulatory sources.

======== EXAMPLES & FORMATTING NOTES ========
- Use metric units by default; provide imperial equivalents in parentheses (e.g., 50 mm (1.97 in)).
- When listing vehicle compatibility, prefer exact OEM references (part number cross-refs) when available.
- Keep Markdown readable for end-users: short paragraphs, bullet lists, and clear headings.
- Machine JSON must be parseable (no comments, strictly JSON types).

======== USER INTERACTIONS ========
- If the user provides additional context (part number, VIN, vehicle photos), incorporate immediately and re-score confidences.
- If user asks only for a quick ID, provide a compact summary and the JSON `response_json` payload.
- Always include a short one-line summary at the top of the Markdown output: "One-line ID summary — [most-likely name] (Confidence: XX%)".

End of system prompt.
"""

        
        # Prepare additional context keywords
        context_keywords = keywords or []
        context_keywords.extend([
            "automotive parts", 
            "technical analysis", 
            "global sourcing", 
            "parts identification"
        ])
        
        # Call OpenAI Vision API
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": f"Analyze this automotive part image. Additional context keywords: {', '.join(context_keywords)}"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=3000,  # Increased to accommodate detailed analysis
            temperature=0.7,  # Slightly more creative to capture nuanced details
            top_p=0.9
        )
        
        # Extract full analysis text
        full_analysis = response.choices[0].message.content
        
        # Parse analysis into flat structure
        parsed_data = self._parse_analysis(full_analysis, max_predictions, confidence_threshold)
        
        # Calculate processing time
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Prepare flat result structure
        result = {
            "success": True,
            "status": "completed",
            **parsed_data,  # Merge all flat fields
            "processing_time_seconds": round(processing_time, 2),
            "model_version": "SpareFinderAI Part Analysis v1.0"
        }
        
        self.logger.info(f"Image analysis completed: {parsed_data.get('class_name', 'Unknown part')}")
        
        return result
    
    except Exception as e:
        self.logger.error(f"Image analysis error: {e}")
        return {
            "success": False,
            "status": "failed",
            "error": str(e),
            "class_name": "Analysis Failed",
            "category": "Error",
            "precise_part_name": "Analysis Failed",
            "material_composition": "Unknown",
            "manufacturer": "Unknown",
            "confidence_score": 0,
            "confidence_explanation": f"Analysis failed: {str(e)}",
            "estimated_price": {
                "new": "Not available",
                "used": "Not available",
                "refurbished": "Not available"
            },
            "description": "Image analysis could not be completed",
            "technical_data_sheet": {
                "part_type": "Unknown",
                "material": "Unknown",
                "common_specs": "Not available",
                "load_rating": "Unknown",
                "weight": "Unknown",
                "reusability": "Unknown",
                "finish": "Unknown",
                "temperature_tolerance": "Unknown"
            },
            "compatible_vehicles": [],
            "engine_types": [],
            "buy_links": {},
            "suppliers": [],
            "fitment_tips": "Retry with a clearer image",
            "additional_instructions": "Please upload a high-quality image and try again",
            "full_analysis": "",
            "processing_time_seconds": 0
        }

# Update the class method to use the new synchronous method
OpenAIImageAnalyzer.analyze_image = analyze_image

# Example usage if script is run directly
if __name__ == "__main__":
    # Example image path - replace with actual path
    sample_image_path = "path/to/your/part/image.jpg"
    
    # Perform analysis
    async def main():
        result = await analyze_part_image(sample_image_path)
        
        # Print results
        if result and result.get('success'):
            print("Part Analysis Results:")
            print(json.dumps(result, indent=2))
        else:
            print("Part analysis failed.")
    
    # Run the async function
    asyncio.run(main())