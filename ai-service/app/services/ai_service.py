import asyncio
import base64
import io
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any, Union, Tuple
from PIL import Image
import numpy as np

import structlog

from app.models.prediction import Prediction
from app.utils.exceptions import AIServiceException
from app.core.config import get_settings

# Import Google Vision service
try:
    from .google_vision_service import GoogleVisionService
    GOOGLE_VISION_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Google Vision service import failed: {str(e)}")
    GOOGLE_VISION_AVAILABLE = False

# Import web scraper
try:
    from .web_scraper import get_automotive_scraper
    WEB_SCRAPER_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Web scraper import failed: {str(e)}")
    WEB_SCRAPER_AVAILABLE = False

logger = structlog.get_logger()
settings = get_settings()


class AIService:
    """Google Vision + Web Scraping AI service for automotive part identification."""
    
    def __init__(self):
        """Initialize the Google Vision + Web Scraping AI service."""
        self.google_vision_service = None
        self.web_scraper = None
        self.is_initialized = False
        self.web_scraper_available = WEB_SCRAPER_AVAILABLE and settings.WEB_SCRAPING_ENABLED
        self.google_vision_available = GOOGLE_VISION_AVAILABLE
        
        # Initialize services status
        if self.web_scraper_available:
            logger.info("Web scraper available")
        else:
            logger.warning("Web scraper not available")
        
        if self.google_vision_available:
            logger.info("Google Vision service available")
        else:
            logger.warning("Google Vision service not available")
    
    async def load_model(self) -> None:
        """Initialize Google Vision + Web Scraping services."""
        try:
            if not self.google_vision_available:
                raise AIServiceException(
                    error_type="google_vision_unavailable",
                    message="Google Vision service is not available",
                    status_code=500
                )
            
            logger.info("Initializing Google Vision API service...")
            
            # Initialize Google Vision service
            self.google_vision_service = GoogleVisionService()
            
            # Test the connection
            connection_test = await self.google_vision_service.test_connection()
            if not connection_test:
                raise ValueError("Google Vision API connection test failed")
            
            # Initialize web scraper if available
            if self.web_scraper_available:
                logger.info("Initializing web scraper...")
                self.web_scraper = get_automotive_scraper()
                await self.web_scraper.initialize()
                logger.info("Web scraper initialized successfully")
            
            self.is_initialized = True
            logger.info("Google Vision + Web Scraping AI service initialized successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize services: {str(e)}")
            raise AIServiceException(
                error_type="service_initialization_error",
                message=f"Failed to initialize services: {str(e)}",
                status_code=500
            )
    
    async def predict(
        self,
        image: np.ndarray,
        confidence_threshold: float = 0.5,
        max_predictions: int = 5
    ) -> List[Prediction]:
        """Make predictions using Google Vision API."""
        if not self.is_initialized:
            raise AIServiceException(
                error_type="model_not_ready",
                message="Google Vision service is not initialized",
                status_code=503
            )
        
        try:
            # Convert numpy array to PIL Image then to bytes
            pil_image = await self._convert_numpy_to_pil(image)
            image_bytes = await self._convert_pil_to_bytes(pil_image)
            
            # Use Google Vision for image analysis
            analysis_result = await self.google_vision_service.analyze_automotive_part(image_bytes)
            
            # Convert Google Vision result to predictions
            predictions = await self._convert_google_vision_to_predictions(
                analysis_result, 
                confidence_threshold, 
                max_predictions
            )
            
            logger.info(f"Google Vision identified {len(predictions)} automotive parts")
            return predictions
                
        except Exception as e:
            logger.error(f"Google Vision prediction failed: {str(e)}")
            raise AIServiceException(
                error_type="google_vision_prediction_error",
                message=f"Google Vision prediction failed: {str(e)}",
                status_code=500
            )
    
    async def predict_with_web_scraping(
        self,
        image: np.ndarray,
        confidence_threshold: float = 0.5,
        max_predictions: int = 5,
        include_scraping: bool = True
    ) -> Tuple[List[Prediction], List[Dict[str, Any]]]:
        """
        Predict automotive parts using Google Vision and optionally search for similar parts via web scraping.
        """
        try:
            # Get predictions from Google Vision
            predictions = await self.predict(image, confidence_threshold, max_predictions)
            
            similar_images = []
            
            # If we have predictions and web scraping is enabled, search for similar parts
            if predictions and include_scraping and self.web_scraper_available:
                try:
                    # Use the top prediction for web scraping
                    top_prediction = predictions[0]
                    part_name = top_prediction.class_name
                    
                    logger.info(f"Searching for similar parts: {part_name}")
                    
                    # Search for similar parts
                    scraping_results = await self.web_scraper.search_automotive_part(part_name)
                    
                    if scraping_results:
                        similar_images = scraping_results
                        logger.info(f"Found {len(similar_images)} similar parts via web scraping")
                    else:
                        logger.warning("No similar parts found via web scraping")
                        
                except Exception as scraping_error:
                    logger.warning(f"Web scraping failed: {str(scraping_error)}")
                    # Continue without scraping results
            
            return predictions, similar_images
            
        except Exception as e:
            logger.error(f"Prediction with web scraping failed: {str(e)}")
            raise AIServiceException(
                error_type="prediction_with_scraping_error",
                message=f"Prediction with web scraping failed: {str(e)}",
                status_code=500
            )
    
    async def process_part_image(self, image_data: bytes) -> Dict[str, Any]:
        """Process automotive part image and return comprehensive analysis."""
        try:
            # Convert bytes to numpy array
            image = await self._convert_bytes_to_numpy(image_data)
            
            # Get predictions with web scraping
            predictions, similar_images = await self.predict_with_web_scraping(
                image=image,
                confidence_threshold=0.3,  # Lower threshold for more results
                max_predictions=3,
                include_scraping=True
            )
            
            if not predictions:
                raise AIServiceException(
                    error_type="no_predictions",
                    message="No automotive parts detected in the image",
                    status_code=400
                )
            
            # Format the response
            result = {
                "success": True,
                "predictions": [
                    {
                        "class_name": pred.class_name,
                        "confidence": pred.confidence,
                        "description": pred.description,
                        "category": pred.category,
                        "manufacturer": pred.manufacturer,
                        "part_number": pred.part_number,
                        "estimated_price": pred.estimated_price,
                        "compatibility": pred.compatibility
                    }
                    for pred in predictions
                ],
                "similar_images": similar_images,
                "model_version": self.get_model_version(),
                "processing_time": 0.0,
                "image_metadata": {
                    "web_scraping_used": len(similar_images) > 0
                }
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to process part image: {str(e)}")
            raise AIServiceException(
                error_type="image_processing_error",
                message=f"Failed to process part image: {str(e)}",
                status_code=500
            )
    
    async def _convert_numpy_to_pil(self, image: np.ndarray) -> Image.Image:
        """Convert numpy array image to PIL Image."""
        try:
            if image.dtype == np.float32 or image.dtype == np.float64:
                image = (image * 255).astype(np.uint8)
            
            pil_image = Image.fromarray(image)
            
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            return pil_image
            
        except Exception as e:
            raise AIServiceException(
                error_type="image_conversion_error",
                message=f"Failed to convert image to PIL: {str(e)}",
                status_code=400
            )
    
    async def _convert_pil_to_bytes(self, pil_image: Image.Image) -> bytes:
        """Convert PIL Image to bytes."""
        try:
            img_byte_arr = io.BytesIO()
            pil_image.save(img_byte_arr, format='PNG')
            return img_byte_arr.getvalue()
        except Exception as e:
            raise AIServiceException(
                error_type="image_conversion_error",
                message=f"Failed to convert PIL to bytes: {str(e)}",
                status_code=400
            )
    
    async def _convert_bytes_to_numpy(self, image_data: bytes) -> np.ndarray:
        """Convert image bytes to numpy array."""
        try:
            pil_image = Image.open(io.BytesIO(image_data))
            
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            numpy_image = np.array(pil_image)
            
            return numpy_image
            
        except Exception as e:
            raise AIServiceException(
                error_type="image_conversion_error",
                message=f"Failed to convert bytes to numpy: {str(e)}",
                status_code=400
            )
    
    async def _convert_google_vision_to_predictions(
        self, 
        analysis_result: Dict[str, Any], 
        confidence_threshold: float, 
        max_predictions: int
    ) -> List[Prediction]:
        """Convert Google Vision analysis result to predictions."""
        try:
            predictions = []
            
            # Safely extract fields with defaults
            part_name = analysis_result.get('part_name', 'Unknown Part')
            confidence = analysis_result.get('confidence', 35.0)
            description = analysis_result.get('description', f'{part_name} component for general applications.')
            category = analysis_result.get('category', 'General')
            price_range = analysis_result.get('price_range', '£5 - £100')
            
            # Use a more generous confidence threshold for automotive parts
            effective_threshold = min(confidence_threshold * 100, 30.0)  # Never require more than 30% confidence
            
            if confidence >= effective_threshold:
                prediction = Prediction(
                    class_name=part_name,
                    confidence=confidence / 100.0,
                    description=description,
                    category=category,
                    manufacturer="Unknown",
                    part_number=await self._generate_part_number(part_name),
                    estimated_price=price_range,
                    compatibility=[]
                )
                predictions.append(prediction)
            else:
                # If confidence is too low, still create a prediction but with adjusted confidence
                logger.info(f"Low confidence ({confidence:.1f}%) but creating prediction anyway")
                prediction = Prediction(
                    class_name=part_name,
                    confidence=max(confidence / 100.0, 0.25),  # Minimum 25% confidence
                    description=description,
                    category=category,
                    manufacturer="Unknown",
                    part_number=await self._generate_part_number(part_name),
                    estimated_price=price_range,
                    compatibility=[]
                )
                predictions.append(prediction)
            
            return predictions[:max_predictions]
            
        except Exception as e:
            logger.error(f"Failed to convert Google Vision result: {str(e)}")
            logger.error(f"Analysis result was: {analysis_result}")
            raise AIServiceException(
                error_type="prediction_conversion_error",
                message=f"Failed to convert Google Vision result: {str(e)}",
                status_code=500
            )
    
    async def _generate_part_number(self, class_name: str) -> str:
        """Generate a generic part number based on class name."""
        clean_name = class_name.upper().replace(" ", "").replace("_", "")[:8]
        import random
        number = random.randint(1000, 9999)
        return f"{clean_name}-{number}"
    
    def is_ready(self) -> bool:
        """Check if the AI service is ready to make predictions."""
        return self.is_initialized and self.google_vision_service is not None
    
    def get_model_version(self) -> str:
        """Get the model version string."""
        return "Google Vision API v1"
    
    async def cleanup(self) -> None:
        """Clean up resources."""
        try:
            if self.web_scraper:
                await self.web_scraper.cleanup()
            
            if self.google_vision_service:
                pass
                
            logger.info("Google Vision service cleanup completed")
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}") 