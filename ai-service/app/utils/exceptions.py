"""
Custom exceptions for the AI Part Finder Service.
"""

from typing import Optional


class AIServiceException(Exception):
    """Base exception class for AI service errors."""
    
    def __init__(
        self,
        error_type: str,
        message: str,
        status_code: int = 500,
        request_id: Optional[str] = None
    ):
        self.error_type = error_type
        self.message = message
        self.status_code = status_code
        self.request_id = request_id
        super().__init__(self.message)


class ModelNotLoadedException(AIServiceException):
    """Raised when AI model is not loaded."""
    
    def __init__(self, message: str = "AI model is not loaded"):
        super().__init__(
            error_type="model_not_loaded",
            message=message,
            status_code=503
        )


class PredictionException(AIServiceException):
    """Raised when prediction fails."""
    
    def __init__(self, message: str, request_id: Optional[str] = None):
        super().__init__(
            error_type="prediction_error",
            message=message,
            status_code=500,
            request_id=request_id
        )


class ImageProcessingException(AIServiceException):
    """Raised when image processing fails."""
    
    def __init__(self, message: str):
        super().__init__(
            error_type="image_processing_error",
            message=message,
            status_code=400
        )


class ExternalAPIException(AIServiceException):
    """Raised when external API calls fail."""
    
    def __init__(self, provider: str, message: str):
        super().__init__(
            error_type="external_api_error",
            message=f"{provider}: {message}",
            status_code=502
        )


class ValidationException(AIServiceException):
    """Raised when request validation fails."""
    
    def __init__(self, message: str):
        super().__init__(
            error_type="validation_error",
            message=message,
            status_code=400
        ) 