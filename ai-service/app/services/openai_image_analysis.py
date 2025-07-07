import os
import base64
import time
import re
import json
import asyncio
from typing import List, Optional, Dict, Any, Union
import traceback

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from openai import OpenAI, AsyncOpenAI
import httpx

from app.core.config import get_settings
import structlog

# Configure structured logging
logger = structlog.get_logger()

# Get settings
settings = get_settings()

# Initialize the FastAPI app
app = FastAPI(title="OpenAI Image Analysis Service")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Initialize the OpenAI clients
openai_client = OpenAI(
    api_key=settings.OPENAI_API_KEY
)
async_openai_client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY
)

# Pydantic models for response
class PartPrediction(BaseModel):
    class_name: str = Field(..., description="Precise name of the automotive part")
    confidence: float = Field(default=0.0, ge=0.0, le=100.0, description="Confidence score of the prediction")
    description: str = Field(..., description="Detailed technical description of the part")
    category: Optional[str] = Field(default=None, description="Automotive part category")
    manufacturer: Optional[str] = Field(default=None, description="Potential manufacturers")
    estimated_price: Optional[str] = Field(default=None, description="Estimated price range")
    compatibility: Optional[List[str]] = Field(default=None, description="Compatible vehicle models or systems")
    material: Optional[str] = Field(default=None, description="Primary material composition")

class SimilarImage(BaseModel):
    url: Optional[str] = Field(default=None, description="URL of similar image")
    similarity_score: Optional[float] = Field(default=None, description="Similarity score")
    source: Optional[str] = Field(default=None, description="Source of the similar image")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional image metadata")

class ImageAnalysisResponse(BaseModel):
    request_id: str
    predictions: List[PartPrediction]
    processing_time: float
    similar_images: Optional[List[SimilarImage]] = None
    model_version: str = "OpenAI GPT-4o Vision v1.0"

# Utility functions
def encode_image(image_bytes: bytes) -> str:
    """Encode image bytes to base64 string"""
    return base64.b64encode(image_bytes).decode('utf-8')

def sanitize_text(text: str) -> str:
    """Sanitize and clean extracted text"""
    return re.sub(r'\s+', ' ', text).strip()

# Authentication dependency
async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    """Verify API key authentication."""
    try:
        if not credentials:
            logger.error("No API key provided")
            raise HTTPException(
                status_code=401,
                detail="No API key provided",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        api_key = credentials.credentials.strip()
        
        if api_key != settings.API_KEY:
            logger.error("Invalid API key provided")
            raise HTTPException(
                status_code=401,
                detail="Invalid API key",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return api_key
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.post("/upload/image", response_model=ImageAnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...), 
    keywords: Optional[str] = None,
    confidence_threshold: float = 0.3,
    max_predictions: int = 3,
    google_vision_data: Optional[Dict[str, Any]] = None,
    api_key: str = Depends(verify_api_key)
):
    """
    Analyze an uploaded image using OpenAI Vision API
    
    Args:
        file: Image file to analyze
        keywords: Additional context keywords
        confidence_threshold: Minimum confidence for predictions
        max_predictions: Maximum number of predictions
        google_vision_data: Optional pre-existing Google Vision analysis data
        api_key: Authentication key
    
    Returns:
        Comprehensive image analysis with predictions
    """
    start_time = time.time()
    request_id = f"openai_vision_req_{int(start_time * 1000)}"
    
    try:
        # Read image file
        image_bytes = await file.read()
        
        # Analyze image
        analysis_result = await openai_image_analyzer.analyze_image(
            image_bytes, 
            google_vision_data=google_vision_data,
            keywords=keywords,
            confidence_threshold=confidence_threshold,
            max_predictions=max_predictions
        )
        
        # Transform predictions to Pydantic model
        predictions = [
            PartPrediction(**pred) for pred in analysis_result.get('predictions', [])
        ]
        
        # Prepare response
        return ImageAnalysisResponse(
            request_id=request_id,
            predictions=predictions,
            processing_time=time.time() - start_time,
            similar_images=analysis_result.get('similar_images'),
            model_version=analysis_result.get('model_version', 'OpenAI GPT-4o Vision v1.0')
        )
    
    except Exception as e:
        logger.error(f"Comprehensive image analysis error: {str(e)}")
        logger.error(f"Error details: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

class OpenAIImageAnalyzer:
    """
    Service for analyzing images using OpenAI Vision API with optional Google Vision integration
    """
    
    def __init__(self):
        """
        Initialize OpenAI Image Analyzer
        """
        self._client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY
        )
    
    def _encode_image(self, image_bytes: bytes) -> str:
        """
        Encode image bytes to base64 string
        """
        return base64.b64encode(image_bytes).decode('utf-8')
    
    async def analyze_image(
        self, 
        image_bytes: bytes, 
        google_vision_data: Optional[Dict[str, Any]] = None,
        keywords: Optional[str] = None,
        confidence_threshold: float = 0.3,
        max_predictions: int = 3
    ) -> Dict[str, Any]:
        try:
            # Initialize predictions with a default empty list
            predictions = []

            # Convert image to base64
            base64_image = base64.b64encode(image_bytes).decode('utf-8')

            # Prepare default keywords
            default_keywords = [
                "automotive parts", 
                "mechanical components", 
                "engine parts", 
                "industrial machinery",
                "vehicle components"
            ]
            
            # Combine keywords
            combined_keywords = []
            if keywords:
                combined_keywords.extend([kw.strip() for kw in keywords.split(',') if kw.strip()])
            combined_keywords.extend(default_keywords)
            
            # Incorporate Google Vision data if provided
            if google_vision_data:
                combined_keywords.extend([
                    google_vision_data.get('part_name', ''),
                    google_vision_data.get('category', ''),
                    google_vision_data.get('part_type', '')
                ])
            
            # Remove duplicates and empty strings
            keywords_prompt = ", ".join(set(filter(bool, combined_keywords)))
            
            # Prepare system and user prompts
            system_prompt = """
            You are an advanced AI automotive parts identification and technical analysis system. 
            Your goal is to provide precise, comprehensive, and technically accurate identification 
            of automotive components from visual input.

            CRITICAL RESPONSE FORMAT:
            1. ALWAYS provide a response with a clear, structured format
            2. If uncertain, state the uncertainty explicitly
            3. Provide the most likely identification even with low confidence

            MANDATORY SECTIONS:
            A. PART IDENTIFICATION
               - Precise Part Name: [EXACT PART NAME]
               - Confidence Level: [0-100%]
               - Reasoning: [Brief explanation of identification]

            B. TECHNICAL SPECIFICATIONS
               - Category: [Specific Automotive Category]
               - Potential Manufacturers: [List of possible manufacturers]
               - Material Composition: [Primary materials]
               - Typical Applications: [Vehicles/Systems]

            C. MARKET INFORMATION
               - Estimated Price Range: [$MIN - $MAX]
               - Replacement Frequency: [Typical service interval]

            D. CONFIDENCE ASSESSMENT
               - Visual Match Confidence: [0-100%]
               - Technical Identification Confidence: [0-100%]
               - Uncertainty Factors: [List any limitations]

            IMPORTANT GUIDELINES:
            - Be as specific as possible
            - Provide quantitative confidence scores
            - If no clear identification is possible, state "UNIDENTIFIED AUTOMOTIVE COMPONENT"
            - Prioritize precision over vagueness
            """
            
            # Detailed user prompt
            user_prompt = f"""
            Perform an exhaustive technical identification and analysis of this automotive component.

            Context Keywords: {keywords_prompt}

            {f'Preliminary Google Vision Analysis: {json.dumps(google_vision_data)}' if google_vision_data else ''}

            COMPREHENSIVE ANALYSIS REQUIREMENTS:
            A. Part Identification
            - Precise Part Name
            - Specific Automotive Category
            - Potential Manufacturers

            B. Technical Specifications
            - Detailed Component Description
            - Material Composition
            - Typical Application/Compatibility
            - Performance Characteristics

            C. Market Information
            - Estimated Price Range
            - Typical Vehicle Models
            - Replacement Frequency

            D. Confidence Assessment
            - Visual Match Confidence (0-100%)
            - Technical Identification Confidence
            - Reasoning for Confidence Level

            IMPORTANT: 
            - Be as specific and technical as possible
            - If uncertain, provide top 3 most likely matches
            - Explain your reasoning and identification process
            """
            
            # Async OpenAI API call
            response = await self._client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                        ]
                    }
                ],
                max_tokens=2000,
                temperature=0.6,
                top_p=0.9
            )
            
            # Extract analysis text
            analysis_text = response.choices[0].message.content or ""
            logger.info(f"Full OpenAI Analysis: {analysis_text}")

            # Extraction helper functions
            def extract_with_fallback(
                text: str, 
                label: str, 
                fallback_value: Optional[str] = None, 
                google_vision_key: Optional[str] = None
            ) -> Optional[str]:
                """Extract information with multiple strategies and Google Vision fallback"""
                try:
                    # Check Google Vision first if key provided
                    if google_vision_data and google_vision_key:
                        vision_value = google_vision_data.get(google_vision_key)
                        if vision_value:
                            return vision_value
                    
                    # More flexible regex extraction
                    patterns = [
                        f"{label}:\\s*(.+?)(?:\n|$)",
                        f"{label}\s*[:-]\s*(.+?)(?:\n|$)",
                        f"(?i){label}\s*(?:is)?\s*(.+?)(?:\n|$)"
                    ]
                    
                    for pattern in patterns:
                        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE | re.DOTALL)
                        if match:
                            extracted = match.group(1).strip()
                            # Additional validation
                            if extracted and len(extracted) > 2:
                                return extracted
                    
                    return fallback_value
                except Exception as e:
                    logger.warning(f"Extraction error for {label}: {e}")
                    return fallback_value
            
            def extract_confidence(text: str) -> float:
                """Enhanced confidence extraction with multiple strategies"""
                try:
                    # Check Google Vision confidence first
                    if google_vision_data and 'confidence_score' in google_vision_data:
                        return float(google_vision_data['confidence_score']) * 100
                    
                    # More flexible confidence extraction
                    confidence_patterns = [
                        r"Confidence\s*(?:Score|Level):\s*(\d+(?:\.\d+)?)\s*%",
                        r"Confidence\s*(?:is)?\s*(\d+(?:\.\d+)?)\s*%",
                        r"(\d+(?:\.\d+)?)\s*%\s*Confidence"
                    ]
                    
                    for pattern in confidence_patterns:
                        match = re.search(pattern, text, re.IGNORECASE)
                        if match:
                            return float(match.group(1))
                    
                    # Textual confidence assessment
                    confidence_map = {
                        "high confidence": 85.0,
                        "very high confidence": 95.0,
                        "moderate confidence": 65.0,
                        "low confidence": 40.0,
                        "extremely confident": 95.0,
                        "somewhat confident": 70.0
                    }
                    
                    for phrase, score in confidence_map.items():
                        if phrase in text.lower():
                            return score
                    
                    return 75.0  # Default confidence
                except Exception as e:
                    logger.warning(f"Confidence extraction error: {e}")
                    return 75.0
            
            # Prepare predictions with more robust extraction
            predictions = [{
                'class_name': extract_with_fallback(analysis_text, "Precise Part Name", "Automotive Component", "part_name") or 
                              extract_with_fallback(analysis_text, "Part Name", "Automotive Component") or 
                              "Automotive Component",
                'confidence': extract_confidence(analysis_text),
                'description': extract_with_fallback(analysis_text, "Detailed Component Description", "Technical automotive component") or 
                               extract_with_fallback(analysis_text, "Description", "Technical automotive component"),
                'category': extract_with_fallback(analysis_text, "Specific Automotive Category", google_vision_key="category") or 
                            extract_with_fallback(analysis_text, "Category", "Automotive Component"),
                'manufacturer': extract_with_fallback(analysis_text, "Potential Manufacturers", google_vision_key="manufacturer") or 
                                extract_with_fallback(analysis_text, "Manufacturer", "Unknown"),
                'estimated_price': extract_with_fallback(analysis_text, "Estimated Price Range", google_vision_key="price_range") or 
                                   extract_with_fallback(analysis_text, "Price Range", "$50 - $500"),
                'material': extract_with_fallback(analysis_text, "Material Composition") or 
                            extract_with_fallback(analysis_text, "Material", "Metal Alloy"),
                'compatibility': re.findall(r"Compatible\s*(?:Vehicle|Model)s?:\s*(.+?)(?:\n|$)", analysis_text, re.IGNORECASE) or 
                                 ["Various Automotive Models"]
            }]
            
            # Ensure at least one prediction exists
            if not predictions[0]['class_name'] or predictions[0]['class_name'] == "Automotive Component":
                predictions[0]['class_name'] = "Unidentified Automotive Part"
            
            # Log predictions for debugging
            logger.info(f"Extracted Predictions: {predictions}")
            
            # Prepare response
            return {
                'predictions': predictions,
                'similar_images': None,
                'processing_time': None,
                'model_version': 'OpenAI GPT-4o Vision v1.0',
                'additional_details': {
                    'full_analysis': analysis_text,
                    'technical_specifications': extract_with_fallback(analysis_text, "Technical Specifications"),
                    'market_information': extract_with_fallback(analysis_text, "Market Information"),
                    'confidence_reasoning': extract_with_fallback(analysis_text, "Reasoning for Confidence Level"),
                    'replacement_frequency': extract_with_fallback(analysis_text, "Replacement Frequency"),
                    'typical_vehicle_models': re.findall(r"Typical\s*Vehicle\s*Models?:\s*(.+?)(?:\n|$)", analysis_text, re.IGNORECASE)
                }
            }
        
        except Exception as e:
            logger.error(f"OpenAI image analysis error: {str(e)}")
            logger.error(f"Error details: {traceback.format_exc()}")
            
            # Return a structured error response
            return {
                'predictions': [],
                'error': str(e),
                'additional_details': {
                    'full_analysis': f"Analysis failed: {str(e)}"
                }
            }

# Initialize OpenAI Image Analyzer
openai_image_analyzer = OpenAIImageAnalyzer()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000) 