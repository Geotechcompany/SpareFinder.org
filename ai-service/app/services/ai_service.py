import asyncio
import base64
import io
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any, Union, Tuple
from PIL import Image
import numpy as np
import time
import uuid
from datetime import datetime
import cv2

import structlog

from app.models.prediction import Prediction
from app.utils.exceptions import AIServiceException
from app.core.config import get_settings

# Import OpenAI and Google Vision Services
from app.services.google_vision_service import GoogleVisionService
from app.services.openai_image_analysis import OpenAIImageAnalyzer

logger = structlog.get_logger()
settings = get_settings()


class AIService:
    """AI Service for part recognition and analysis."""
    
    def __init__(self):
        """Initialize AI Service."""
        self._google_vision_service = GoogleVisionService()
        self._openai_image_analyzer = OpenAIImageAnalyzer()
    
    async def load_model(self):
        """
        Load and initialize image analysis services.
        """
        try:
            # Verify Google Vision service connection
            logger.info("Google Vision Service initialized")
            
            # Verify OpenAI service connection
            logger.info("OpenAI Image Analysis Service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize image analysis service: {e}")
            raise AIServiceException(f"Failed to initialize services: {e}")
    
    async def predict_with_vision(
        self,
        image: np.ndarray,
        confidence_threshold: float = 0.5,
        max_predictions: int = 5,
        keywords: Optional[str] = None
    ) -> Tuple[List[Prediction], List[Dict[str, Any]]]:
        """
        Predict automotive parts using Google Vision and OpenAI analysis.
        
        Args:
            image (np.ndarray): Input image
            confidence_threshold (float): Minimum confidence for predictions
            max_predictions (int): Maximum number of predictions
            keywords (Optional[str]): Additional keywords for analysis
        
        Returns:
            Tuple of predictions and similar images/details
        """
        try:
            # Convert numpy image to bytes
            _, image_bytes = cv2.imencode('.jpg', image)
            image_bytes = image_bytes.tobytes()

            # Step 1: Analyze image using Google Vision service
            google_vision_result = await self._google_vision_service.analyze_image(
                image_bytes, 
                confidence_threshold=confidence_threshold,
                max_predictions=max_predictions
            )
            
            # Step 2: Use OpenAI to enhance and validate Google Vision analysis
            openai_analysis = await self._openai_image_analyzer.analyze_image(
                image_bytes, 
                google_vision_data=google_vision_result,
                keywords=keywords
            )
            
            # Prioritize OpenAI predictions if available, otherwise use Google Vision
            if openai_analysis and openai_analysis.get('predictions'):
                # Transform OpenAI predictions to Prediction objects
                predictions = [
                    Prediction(
                        class_name=pred.get('class_name', 'Automotive Part'),
                        confidence=pred.get('confidence', 0.0) / 100.0,  # Convert to 0-1 scale
                        category=pred.get('category', 'Automotive Component'),
                        description=pred.get('description', ''),
                        manufacturer=pred.get('manufacturer', ''),
                        part_number=None,
                        estimated_price=pred.get('estimated_price', ''),
                        compatibility=pred.get('compatibility', [])
                    )
                    for pred in openai_analysis.get('predictions', [])
                    if pred.get('confidence', 0.0) >= (confidence_threshold * 100)
                ][:max_predictions]
                
                # Prepare similar images from OpenAI analysis
                similar_images = []
            else:
                # Fallback to Google Vision results
                prediction = Prediction(
                    class_name=google_vision_result.get('part_name', 'Automotive Part'),
                    confidence=google_vision_result.get('confidence_score', 0.0) / 100.0,
                    category=google_vision_result.get('technical_details', {}).get('key_components', ['Automotive Part'])[0],
                    description=google_vision_result.get('raw_description', '')
                )
                
                similar_images = [{
                    'url': None,
                    'metadata': {
                        'description': google_vision_result.get('raw_description', '')
                    },
                    'similarity_score': google_vision_result.get('confidence_score', 0.0) / 100.0,
                    'source': 'Google Vision',
                    'title': google_vision_result.get('part_name', 'Automotive Part')
                }]
                
                predictions = [prediction] if prediction.confidence >= confidence_threshold else []
            
            return predictions, similar_images

        except Exception as e:
            logger.error(f"Multi-service prediction failed: {e}")
            raise AIServiceException(
                error_type="multi_service_prediction_error",
                message=f"Failed to analyze image across services: {str(e)}",
                status_code=500
            )
    
    async def process_part_image(
        self, 
        image_data: bytes, 
        user_id: Optional[str] = None,
        keywords: Optional[str] = None,
        confidence_threshold: float = 0.3,
        max_predictions: int = 3
    ) -> Dict[str, Any]:
        """Process automotive part image and return comprehensive analysis."""
        try:
            start_time = time.time()
            
            # Convert bytes to numpy array
            image = await self._convert_bytes_to_numpy(image_data)
            
            # Convert numpy image to bytes for services
            _, image_bytes = cv2.imencode('.jpg', image)
            image_bytes = image_bytes.tobytes()
            
            # Analyze image using Google Vision service
            google_vision_result = await self._google_vision_service.analyze_image(
                image_bytes, 
                confidence_threshold=confidence_threshold,
                max_predictions=max_predictions
            )
            
            # Get predictions from Google Vision and OpenAI
            predictions, similar_images = await self.predict_with_vision(
                image=image,
                confidence_threshold=confidence_threshold,
                max_predictions=max_predictions,
                keywords=keywords
            )
            
            processing_time = time.time() - start_time
            
            if not predictions:
                error_msg = "No automotive parts detected in the image"
                
                raise AIServiceException(
                    error_type="no_predictions",
                    message=error_msg,
                    status_code=400
                )
            
            # Capture OpenAI analysis result
            openai_analysis = await self._openai_image_analyzer.analyze_image(
                image_bytes, 
                google_vision_data=google_vision_result,
                keywords=keywords,
                confidence_threshold=confidence_threshold,
                max_predictions=max_predictions
            )
            
            # Calculate average confidence
            confidence_scores = [pred.confidence for pred in predictions if pred.confidence is not None]
            avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
            
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
                "processing_time": processing_time,
                "image_metadata": {
                    "content_type": "image/jpeg",
                    "size_bytes": len(image_data) if isinstance(image_data, bytes) else None
                },
                # Add additional details from OpenAI analysis
                "additional_details": openai_analysis.get('additional_details', {}) if openai_analysis else {}
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
    
    def is_ready(self) -> bool:
        """Check if the AI service is ready to make predictions."""
        return self._google_vision_service is not None
    
    def get_model_version(self) -> str:
        """Get the model version string."""
        return "SpareFinder AI v2 (Google Vision)"
    
    async def cleanup(self) -> None:
        """Clean up resources."""
        try:
            logger.info("Google Vision Service cleanup completed")
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
    
    def get_google_vision_service(self):
        """
        Get the initialized Google Vision service.
        
        Returns:
            GoogleVisionService: Initialized Google Vision service instance
        """
        return self._google_vision_service

# Singleton instance
ai_service = AIService() 