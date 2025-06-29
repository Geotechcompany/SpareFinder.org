from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator


class Prediction(BaseModel):
    """Individual prediction result."""
    
    class_name: str = Field(description="Predicted class/part name")
    confidence: float = Field(
        description="Confidence score (0.0-1.0)",
        ge=0.0,
        le=1.0
    )
    part_number: Optional[str] = Field(
        default=None,
        description="Generated or looked-up part number"
    )
    description: Optional[str] = Field(
        default=None,
        description="Human-readable description of the part"
    )
    category: Optional[str] = Field(
        default=None,
        description="Part category (e.g., 'Braking System', 'Engine')"
    )
    manufacturer: Optional[str] = Field(
        default=None,
        description="Manufacturer information if available"
    )
    compatibility: Optional[List[str]] = Field(
        default=None,
        description="Compatible vehicle models/years"
    )
    estimated_price: Optional[str] = Field(
        default=None,
        description="Estimated price range"
    )
    google_validation: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Google Search validation metadata"
    )


class PredictionRequest(BaseModel):
    """Request model for predictions."""
    
    confidence_threshold: float = Field(
        default=0.5,
        description="Minimum confidence threshold",
        ge=0.0,
        le=1.0
    )
    max_predictions: int = Field(
        default=5,
        description="Maximum number of predictions to return",
        ge=1,
        le=20
    )
    include_metadata: bool = Field(
        default=True,
        description="Include additional metadata in response"
    )
    
    @validator("confidence_threshold")
    def validate_confidence(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError("Confidence threshold must be between 0.0 and 1.0")
        return v


class PredictionResponse(BaseModel):
    """Response model for predictions."""
    
    request_id: str = Field(description="Unique request identifier")
    predictions: List[Prediction] = Field(description="List of predictions")
    processing_time: float = Field(description="Processing time in seconds")
    model_version: str = Field(description="AI model version used")
    confidence_threshold: float = Field(description="Confidence threshold used")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Optional metadata
    image_metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Original image metadata (size, format, etc.)"
    )
    
    # Similar images from web scraping
    similar_images: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Similar part images found through web scraping"
    )
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class BatchPredictionRequest(BaseModel):
    """Request model for batch predictions."""
    
    confidence_threshold: float = Field(default=0.5, ge=0.0, le=1.0)
    max_predictions: int = Field(default=5, ge=1, le=20)
    include_metadata: bool = Field(default=True)
    
    @validator("confidence_threshold")
    def validate_confidence(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError("Confidence threshold must be between 0.0 and 1.0")
        return v


class BatchPredictionResponse(BaseModel):
    """Response model for batch predictions."""
    
    request_id: str = Field(description="Unique batch request identifier")
    results: List[PredictionResponse] = Field(description="Individual prediction results")
    total_processed: int = Field(description="Total number of images processed")
    total_failed: int = Field(description="Number of failed predictions")
    batch_processing_time: float = Field(description="Total batch processing time")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class HealthCheckResponse(BaseModel):
    """Health check response model."""
    
    status: str = Field(description="Service status")
    timestamp: float = Field(description="Unix timestamp")
    models_loaded: Optional[bool] = Field(
        default=None,
        description="Whether AI models are loaded"
    )
    version: Optional[str] = Field(
        default=None,
        description="Service version"
    )


class ErrorResponse(BaseModel):
    """Error response model."""
    
    error: str = Field(description="Error type/code")
    message: str = Field(description="Human-readable error message")
    request_id: Optional[str] = Field(
        default=None,
        description="Request ID if available"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional error details"
    )
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        } 