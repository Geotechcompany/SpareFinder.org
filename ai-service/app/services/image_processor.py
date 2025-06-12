"""
Image processing service for the AI Part Finder.
Handles image preprocessing, validation, and format conversion.
"""

import io
import logging
from typing import Tuple, Optional
import numpy as np
from PIL import Image
import cv2

from ..utils.exceptions import ImageProcessingException

logger = logging.getLogger(__name__)


class ImageProcessor:
    """Handles image processing operations for part identification."""
    
    def __init__(self):
        """Initialize the image processor."""
        self.supported_formats = ['JPEG', 'PNG', 'WEBP', 'BMP']
        self.max_size = (1024, 1024)  # Maximum image dimensions
        self.min_size = (32, 32)      # Minimum image dimensions
    
    async def process_image(
        self,
        image_data: bytes,
        target_size: Tuple[int, int] = (224, 224)
    ) -> np.ndarray:
        """
        Process image data for AI model input.
        
        Args:
            image_data: Raw image bytes
            target_size: Target dimensions (height, width)
            
        Returns:
            Processed image as numpy array
            
        Raises:
            ImageProcessingException: If image processing fails
        """
        try:
            # Load image from bytes
            image = self._load_image_from_bytes(image_data)
            
            # Validate image
            self._validate_image(image)
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize image
            image = image.resize(target_size, Image.Resampling.LANCZOS)
            
            # Convert to numpy array
            image_array = np.array(image, dtype=np.float32)
            
            # Normalize to [0, 1] range
            image_array = image_array / 255.0
            
            logger.info(f"Successfully processed image to shape: {image_array.shape}")
            return image_array
            
        except Exception as e:
            logger.error(f"Image processing failed: {str(e)}")
            raise ImageProcessingException(f"Failed to process image: {str(e)}")
    
    def _load_image_from_bytes(self, image_data: bytes) -> Image.Image:
        """Load PIL Image from bytes data."""
        try:
            image_stream = io.BytesIO(image_data)
            image = Image.open(image_stream)
            return image
        except Exception as e:
            raise ImageProcessingException(f"Invalid image format: {str(e)}")
    
    def _validate_image(self, image: Image.Image) -> None:
        """Validate image format and dimensions."""
        # Check format
        if image.format not in self.supported_formats:
            raise ImageProcessingException(
                f"Unsupported image format: {image.format}. "
                f"Supported formats: {', '.join(self.supported_formats)}"
            )
        
        # Check dimensions
        width, height = image.size
        
        if width < self.min_size[0] or height < self.min_size[1]:
            raise ImageProcessingException(
                f"Image too small: {width}x{height}. "
                f"Minimum size: {self.min_size[0]}x{self.min_size[1]}"
            )
        
        if width > self.max_size[0] or height > self.max_size[1]:
            logger.warning(
                f"Large image detected: {width}x{height}. "
                f"Will be resized to fit max size: {self.max_size[0]}x{self.max_size[1]}"
            )
    
    async def preprocess_for_opencv(self, image_data: bytes) -> np.ndarray:
        """
        Preprocess image for OpenCV operations.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            OpenCV-compatible numpy array (BGR format)
        """
        try:
            # Decode image using OpenCV
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ImageProcessingException("Failed to decode image with OpenCV")
            
            return image
            
        except Exception as e:
            logger.error(f"OpenCV preprocessing failed: {str(e)}")
            raise ImageProcessingException(f"OpenCV preprocessing failed: {str(e)}")
    
    def get_image_info(self, image_data: bytes) -> dict:
        """
        Get basic information about an image.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Dictionary containing image metadata
        """
        try:
            image = self._load_image_from_bytes(image_data)
            
            return {
                'format': image.format,
                'mode': image.mode,
                'size': image.size,
                'width': image.size[0],
                'height': image.size[1],
                'has_transparency': image.mode in ('RGBA', 'LA') or 'transparency' in image.info,
                'file_size_bytes': len(image_data)
            }
            
        except Exception as e:
            logger.error(f"Failed to get image info: {str(e)}")
            return {
                'error': str(e),
                'file_size_bytes': len(image_data)
            }
    
    async def enhance_image(self, image_data: bytes) -> bytes:
        """
        Apply basic image enhancement techniques.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Enhanced image as bytes
        """
        try:
            # Load image
            image = self._load_image_from_bytes(image_data)
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to OpenCV format for enhancement
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
            lab = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2LAB)
            lab[:, :, 0] = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(lab[:, :, 0])
            enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
            
            # Apply slight sharpening
            kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
            enhanced = cv2.filter2D(enhanced, -1, kernel)
            
            # Convert back to PIL and save
            enhanced_image = Image.fromarray(cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB))
            
            # Save to bytes
            output_buffer = io.BytesIO()
            enhanced_image.save(output_buffer, format='JPEG', quality=95)
            output_buffer.seek(0)
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Image enhancement failed: {str(e)}")
            # Return original image if enhancement fails
            return image_data 