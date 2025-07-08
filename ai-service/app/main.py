import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any
from datetime import datetime

import cv2
import numpy as np
import structlog
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, Query, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram, generate_latest
from pydantic import BaseModel, Field
import uvicorn
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import base64
from openai import OpenAI

from app.core.config import get_settings
from app.services.ai_service import AIService
from app.services.image_processor import ImageProcessor
from app.models.prediction import PredictionRequest, PredictionResponse
from app.utils.exceptions import AIServiceException

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Metrics
PREDICTION_COUNTER = Counter('predictions_total', 'Total predictions made')
PREDICTION_DURATION = Histogram('prediction_duration_seconds', 'Time spent on predictions')
ERROR_COUNTER = Counter('errors_total', 'Total errors', ['error_type'])

# Global services
ai_service: Optional[AIService] = None
image_processor: Optional[ImageProcessor] = None
openai_client: Optional[OpenAI] = None

settings = get_settings()
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown."""
    global ai_service, image_processor, openai_client
    
    logger.info("Starting AI Part Finder Service with Google Vision...")
    
    try:
        # Initialize services
        ai_service = AIService()
        image_processor = ImageProcessor()
        
        # Load Google Vision service
        await ai_service.load_model()
        logger.info("Google Vision service initialized successfully")
        
        # Initialize OpenAI client
        openai_client = OpenAI(
            api_key=settings.OPENAI_API_KEY or 'sk-proj-default-key'
        )
        
        yield
        
    except Exception as e:
        logger.error("Failed to initialize services", error=str(e))
        raise
    finally:
        logger.info("Shutting down AI Part Finder Service...")
        if ai_service:
            await ai_service.cleanup()

# Create FastAPI app with lifespan
app = FastAPI(
    title="AI Part Finder Service - Google Vision",
    description="Google Vision API powered automotive part identification",
    version="2.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,  # Set to False since we're not sending credentials
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["X-Process-Time"]
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

@app.middleware("http")
async def add_process_time_header(request, call_next):
    """Add processing time to response headers."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Health check endpoints
@app.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy", 
        "timestamp": time.time(),
        "service": "Google Vision",
        "version": "2.1.0"
    }

@app.get("/health/ready")
async def readiness_check():
    """Readiness check - ensures Google Vision service is ready."""
    if not ai_service or not ai_service.is_ready():
        raise HTTPException(status_code=503, detail="Google Vision service not ready")
    
    return {
        "status": "ready", 
        "google_vision_ready": True
    }

@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint."""
    return generate_latest()

# Authentication dependency
async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API key authentication."""
    try:
        if not credentials:
            logger.error("No API key provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No API key provided",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        api_key = credentials.credentials.strip()
        
        if api_key != settings.API_KEY:
            logger.error("Invalid API key provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return api_key
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Main prediction endpoint with Google Vision
@app.post("/predict", response_model=PredictionResponse)
async def predict_part(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    confidence_threshold: float = 0.5,
    max_predictions: int = 5,
    api_key: str = Depends(verify_api_key)
):
    """
    Main prediction endpoint for automotive parts using Google Vision API.
    
    Args:
        file: Image file to analyze (JPEG, PNG, WebP)
        confidence_threshold: Minimum confidence for predictions (0.0-1.0)
        max_predictions: Maximum number of predictions to return
        api_key: API key for authentication
    
    Returns:
        PredictionResponse with predictions and metadata
    """
    start_time = time.time()
    request_id = f"google_vision_req_{int(time.time() * 1000)}"
    
    logger.info(
        "Google Vision prediction request started",
        request_id=request_id,
        filename=file.filename,
        content_type=file.content_type
    )
    
    try:
        # Validate file
        if not file.content_type or not file.content_type.startswith('image/'):
            ERROR_COUNTER.labels(error_type='invalid_file_type').inc()
            raise HTTPException(
                status_code=400,
                detail="File must be an image (JPEG, PNG, WebP)"
            )
        
        # Check file size (10MB limit)
        if file.size and file.size > 10 * 1024 * 1024:
            ERROR_COUNTER.labels(error_type='file_too_large').inc()
            raise HTTPException(
                status_code=413,
                detail="File size exceeds 10MB limit"
            )
        
        # Read and process image
        image_data = await file.read()
        processed_image = await image_processor.process_image(
            image_data,
            target_size=(512, 512)  # Higher resolution for Google Vision
        )
        
        # Make prediction with Google Vision
        with PREDICTION_DURATION.time():
                predictions = await ai_service.predict_with_vision(
                    processed_image,
                    confidence_threshold=confidence_threshold,
                    max_predictions=max_predictions
                )
        
        PREDICTION_COUNTER.inc()
        
        # Create response
        response = PredictionResponse(
            request_id=request_id,
            predictions=predictions,
            processing_time=time.time() - start_time,
            model_version=ai_service.get_model_version(),
            confidence_threshold=confidence_threshold,
            image_metadata={
                "filename": file.filename,
                "content_type": file.content_type,
                "size_bytes": len(image_data),
                "processed_with": "Google Vision API"
            }
        )
        
        logger.info(
            "Google Vision prediction completed",
            request_id=request_id,
            predictions_count=len(predictions),
            processing_time=response.processing_time
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        ERROR_COUNTER.labels(error_type='google_vision_prediction_error').inc()
        logger.error("Google Vision prediction failed", request_id=request_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

# Providers endpoint
@app.get("/providers")
async def get_available_providers(api_key: str = Depends(verify_api_key)):
    """
    Get list of available service providers.
    """
    return {
        "ai_providers": ["Google Vision"],
        "total_configured": 1,
        "message": "Google Vision enabled"
    }

# Error handlers
@app.exception_handler(AIServiceException)
async def ai_service_exception_handler(request, exc: AIServiceException):
    """Handle AI service specific exceptions."""
    ERROR_COUNTER.labels(error_type='ai_service_error').inc()
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_type,
            "message": exc.message,
            "request_id": getattr(exc, 'request_id', None),
            "service": "Google Vision API"
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handle all other exceptions."""
    ERROR_COUNTER.labels(error_type='unhandled_error').inc()
    logger.error("Unhandled exception", error=str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred",
            "service": "Google Vision API"
        }
    )

# Utility functions for logging and analytics
async def log_prediction_analytics(
    request_id: str,
    predictions_count: int,
    processing_time: float
):
    """Log analytics data for monitoring and optimization."""
    logger.info(
        "Analytics data",
        request_id=request_id,
        predictions_count=predictions_count,
        processing_time=processing_time,
        model_type="google_vision",
        event_type="prediction_analytics"
        )

# Define the upload and analyze image function
@app.post("/openai/upload/image", response_model=Dict[str, Any])
async def upload_and_analyze_image(
    file: UploadFile = File(...), 
    keywords: Optional[str] = None,
    confidence_threshold: float = 0.3,
    max_predictions: int = 3
):
    """
    Upload and analyze an image using OpenAI and Google Vision services.
    
    Args:
        file (UploadFile): Image file to analyze
        keywords (Optional[str]): Additional keywords to refine analysis
        confidence_threshold (float): Minimum confidence score for predictions
        max_predictions (int): Maximum number of predictions to return
    
    Returns:
        JSONResponse with image analysis results
    """
    try:
        # Read file contents
        image_data = await file.read()
        
        # Validate file size
        if len(image_data) > (10 * 1024 * 1024):  # 10 MB limit
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB")
        
        # Validate file type (basic check)
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        # Perform image analysis
        analysis_result = await ai_service.process_part_image(
            image_data=image_data,
            keywords=keywords,
            confidence_threshold=confidence_threshold,
            max_predictions=max_predictions
        )
        
        return JSONResponse(
            status_code=200,
            content=analysis_result
        )
    
    except Exception as e:
        # Log the error for debugging
        logger.error(f"Image upload and analysis failed: {str(e)}")
        
        # Return a structured error response
        return JSONResponse(
            status_code=500,
            content={
                "error": "Image analysis failed",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )

# Print out all registered routes for debugging
@app.on_event("startup")
def log_routes():
    print("Registered routes:")
    for route in app.routes:
        print(f"{route.path}: {route.methods}")

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "main:app", 
        host=settings.HOST, 
        port=settings.PORT, 
        reload=settings.DEBUG
    ) 