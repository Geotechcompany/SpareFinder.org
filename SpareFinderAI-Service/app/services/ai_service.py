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
            system_prompt = """You are an expert automotive parts analyst and technical documentation AI. When given an image of an automotive part, you must analyze the part visually and generate a comprehensive, structured response with the following sections:

1. **🛞 Part Identification**
   - Precise part name
   - Category or type of system it belongs to (e.g. suspension, forced induction, drivetrain)
   - Material composition
   - Typical size, shape, or distinguishing features

2. **📘 Technical Description**
   - A plain-language explanation of what the part is and how it functions
   - Common use cases (e.g. daily driving, off-road, racing, etc.)
   - Differences from similar parts if applicable

3. **📊 Technical Data Sheet**
   Present this section as a markdown table with:
   - Part type
   - Material
   - Common sizes or specs
   - Bolt pattern(s)
   - Offset range
   - Load rating
   - Weight
   - Center bore size
   - Reusability
   - Finish options
   - Temperature tolerance

4. **🚗 Compatible Vehicles**
   - List example makes and models (globally) this part is compatible with
   - Include both OEM use and aftermarket potential

5. **💰 Pricing & Availability**
   - Provide average new, used, and refurbished price ranges in USD
   - Include fitment tips like diameter, bolt pattern, offset, etc.

6. **🌍 Where to Buy**
   List international online vendors that supply this part, including:
   - Website URL
   - Contact phone/email
   - Shipping region (global, USA, EU, etc.)
   - Any special services (fitment tool, support, chat, etc.)

7. **📈 Confidence Score**
   - Return confidence score of part identification
   - Explain any uncertainty (e.g. missing markings, image clarity)

8. **📤 Additional Instructions**
   - Suggest actions the user can take to improve accuracy (e.g. upload image with visible label/branding/part number)

The output should be cleanly structured for web/app rendering and written in clear, professional English, suitable for a parts lookup app or ecommerce site. Use emojis only in section headers. Avoid naming the AI model or inference engine used. Do not mention OpenAI, GPT, or model versions.

CRITICAL ANALYSIS GUIDELINES:
- Provide MAXIMUM technical precision
- Ensure COMPREHENSIVE documentational depth
- Maintain GLOBAL technical standardization
- Generate ACTIONABLE engineering insights

MANDATORY OUTPUT FORMAT:
- Use markdown for structured, readable output
- Include ALL specified sections
- Provide quantitative, measurable data
- Ensure cross-regional technical compatibility
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
            
            # Parse analysis into structured predictions
            predictions = self._parse_analysis(full_analysis, max_predictions, confidence_threshold)
            
            # Calculate processing time
            end_time = asyncio.get_event_loop().time()
            processing_time = end_time - start_time
            
            # Prepare result
            result = {
                "success": True,
                "predictions": predictions,
                "full_analysis": full_analysis,
                "processing_time": processing_time,
                "model_version": "Advanced Vision Analysis"
            }
            
            self.logger.info(f"Image analysis completed: {len(predictions)} predictions")
            
            return result
        
        except Exception as e:
            self.logger.error(f"Image analysis error: {e}")
            return {
                "success": False,
                "error": str(e),
                "predictions": [],
                "full_analysis": "",
                "processing_time": 0
            }

    def _parse_analysis(
        self, 
        analysis_text: str, 
        max_predictions: int = 3, 
        confidence_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Parse the analysis text into structured predictions with enhanced purchasing information
        
        :param analysis_text: Full text analysis from OpenAI
        :param max_predictions: Maximum number of predictions to return
        :param confidence_threshold: Minimum confidence for predictions
        :return: List of prediction dictionaries with purchasing details
        """
        try:
            # Enhanced parsing with new structured output
            predictions = []
            
            # Extract part identification details
            part_name_match = re.search(r'\*\*🛞 Part Identification\*\*\n(.*?)(?=\n\*\*)', analysis_text, re.DOTALL | re.IGNORECASE)
            part_name_text = part_name_match.group(1) if part_name_match else ""
            
            # Extract specific details
            part_name = re.search(r'- Precise part name:\s*(.+)', part_name_text, re.IGNORECASE)
            part_name = part_name.group(1).strip() if part_name else "Automotive Component"
            
            category_match = re.search(r'- Category or type of system:\s*(.+)', part_name_text, re.IGNORECASE)
            category = category_match.group(1).strip() if category_match else "Automotive Parts"
            
            material_match = re.search(r'- Material composition:\s*(.+)', part_name_text, re.IGNORECASE)
            material = material_match.group(1).strip() if material_match else "Unknown"
            
            # Extract pricing information
            pricing_match = re.search(r'\*\*💰 Pricing & Availability\*\*\n(.*?)(?=\n\*\*)', analysis_text, re.DOTALL | re.IGNORECASE)
            pricing_text = pricing_match.group(1) if pricing_match else ""
            
            price_range_match = re.search(r'- Average price ranges:\s*(.+)', pricing_text, re.IGNORECASE)
            estimated_price = price_range_match.group(1).strip() if price_range_match else "Price not available"
            
            # Extract vendor information
            vendors_match = re.search(r'\*\*🌍 Where to Buy\*\*\n(.*?)(?=\n\*\*)', analysis_text, re.DOTALL | re.IGNORECASE)
            vendors_text = vendors_match.group(1) if vendors_match else ""
            
            # Extract vendor details
            vendor_urls = re.findall(r'- Website URL:\s*(.+)', vendors_text, re.IGNORECASE)
            
            # Extract confidence score
            confidence_match = re.search(r'\*\*📈 Confidence Score\*\*\n(.*?)(?=\n\*\*)', analysis_text, re.DOTALL | re.IGNORECASE)
            confidence_text = confidence_match.group(1) if confidence_match else ""
            
            confidence_score_match = re.search(r'- Confidence score:\s*(\d+(?:\.\d+)?)', confidence_text, re.IGNORECASE)
            confidence = float(confidence_score_match.group(1)) if confidence_score_match else 0.7
            
            # Create primary prediction
            primary_prediction = {
                "class_name": part_name,
                "confidence": confidence,
                "description": analysis_text[:1000],  # First 1000 chars as description
                "category": category,
                "manufacturer": "Not Specified",
                "estimated_price": estimated_price,
                "part_number": None,
                "compatibility": [],
                "purchasing_info": {
                    "global_contacts": vendor_urls,
                    "recommended_sources": [
                        {
                            "name": vendor_url,
                            "url": vendor_url,
                            "description": "Global parts supplier"
                        } for vendor_url in vendor_urls[:3]  # Limit to top 3 vendors
                    ]
                },
                "technical_details": {
                    "material": material,
                    "additional_info": part_name_text
                }
            }
            
            predictions.append(primary_prediction)
            
            return predictions[:max_predictions]
        
        except Exception as e:
            self.logger.error(f"Prediction parsing error: {e}")
            return [{
                "class_name": "Automotive Component",
                "confidence": 0.5,
                "description": "Unable to parse detailed analysis",
                "category": "Unknown",
                "manufacturer": "Unknown",
                "estimated_price": "Not available",
                "purchasing_info": {
                    "global_contacts": [],
                    "recommended_sources": [
                        {
                            "name": "Global Auto Parts Finder",
                            "url": "https://www.globalautopartsfinder.com",
                            "description": "Fallback international parts search platform"
                        }
                    ]
                },
                "technical_details": {
                    "error": "Failed to parse technical details",
                    "details": str(e)
                }
            }]

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
        
        # Ensure the result always has a consistent structure
        if not result or not result.get('success'):
            return {
                "success": False,
                "status": "failed",
                "error": "Analysis could not be completed",
                "predictions": [],
                "full_analysis": "",
                "processing_time": 0
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
        system_prompt = """You are an expert automotive parts analyst and technical documentation AI. When given an image of an automotive part, you must analyze the part visually and generate a comprehensive, structured response with the following sections:

1. **🛞 Part Identification**
   - Precise part name
   - Category or type of system it belongs to (e.g. suspension, forced induction, drivetrain)
   - Material composition
   - Typical size, shape, or distinguishing features

2. **📘 Technical Description**
   - A plain-language explanation of what the part is and how it functions
   - Common use cases (e.g. daily driving, off-road, racing, etc.)
   - Differences from similar parts if applicable

3. **📊 Technical Data Sheet**
   Present this section as a markdown table with:
   - Part type
   - Material
   - Common sizes or specs
   - Bolt pattern(s)
   - Offset range
   - Load rating
   - Weight
   - Center bore size
   - Reusability
   - Finish options
   - Temperature tolerance

4. **🚗 Compatible Vehicles**
   - List example makes and models (globally) this part is compatible with
   - Include both OEM use and aftermarket potential

5. **💰 Pricing & Availability**
   - Provide average new, used, and refurbished price ranges in USD
   - Include fitment tips like diameter, bolt pattern, offset, etc.

6. **🌍 Where to Buy**
   List international online vendors that supply this part, including:
   - Website URL
   - Contact phone/email
   - Shipping region (global, USA, EU, etc.)
   - Any special services (fitment tool, support, chat, etc.)

7. **📈 Confidence Score**
   - Return confidence score of part identification
   - Explain any uncertainty (e.g. missing markings, image clarity)

8. **📤 Additional Instructions**
   - Suggest actions the user can take to improve accuracy (e.g. upload image with visible label/branding/part number)

The output should be cleanly structured for web/app rendering and written in clear, professional English, suitable for a parts lookup app or ecommerce site. Use emojis only in section headers. Avoid naming the AI model or inference engine used. Do not mention OpenAI, GPT, or model versions.

CRITICAL ANALYSIS GUIDELINES:
- Provide MAXIMUM technical precision
- Ensure COMPREHENSIVE documentational depth
- Maintain GLOBAL technical standardization
- Generate ACTIONABLE engineering insights

MANDATORY OUTPUT FORMAT:
- Use markdown for structured, readable output
- Include ALL specified sections
- Provide quantitative, measurable data
- Ensure cross-regional technical compatibility
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
        
        # Parse analysis into structured predictions
        predictions = self._parse_analysis(full_analysis, max_predictions, confidence_threshold)
        
        # Calculate processing time
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Prepare result
        result = {
            "success": True,
            "predictions": predictions,
            "full_analysis": full_analysis,
            "processing_time": processing_time,
            "model_version": "Advanced Vision Analysis"
        }
        
        self.logger.info(f"Image analysis completed: {len(predictions)} predictions")
        
        return result
    
    except Exception as e:
        self.logger.error(f"Image analysis error: {e}")
        return {
            "success": False,
            "error": str(e),
            "predictions": [],
            "full_analysis": "",
            "processing_time": 0
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