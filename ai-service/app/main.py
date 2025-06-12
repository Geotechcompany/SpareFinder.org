import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

import cv2
import numpy as np
import structlog
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, BackgroundTasks, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram, generate_latest
from pydantic import BaseModel, Field
import uvicorn
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import get_settings
from app.services.ai_service import AIService
from app.services.image_processor import ImageProcessor
from app.services.google_search import google_search_service
from app.models.prediction import PredictionRequest, PredictionResponse
from app.utils.exceptions import AIServiceException
from app.services.external_part_api import external_part_api, PartResult

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

settings = get_settings()
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown."""
    global ai_service, image_processor
    
    logger.info("Starting AI Part Finder Service...")
    
    try:
        # Initialize services
        ai_service = AIService(
            model_path=settings.MODEL_PATH,
            model_type=settings.MODEL_TYPE
        )
        image_processor = ImageProcessor()
        
        # Load AI models
        await ai_service.load_model()
        logger.info("AI models loaded successfully")
        
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
    title="AI Part Finder Service",
    description="AI-powered automotive part identification and classification service",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
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
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/health/ready")
async def readiness_check():
    """Readiness check - ensures AI models are loaded."""
    if not ai_service or not ai_service.is_ready():
        raise HTTPException(status_code=503, detail="Service not ready")
    return {"status": "ready", "models_loaded": True}

@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint."""
    return generate_latest()

# Authentication dependency
async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API key authentication."""
    if credentials.credentials != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials

# Main prediction endpoint
@app.post("/predict", response_model=PredictionResponse)
async def predict_part(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    confidence_threshold: float = 0.5,
    max_predictions: int = 5,
    api_key: str = Depends(verify_api_key)
):
    """
    Predict automotive part from uploaded image.
    
    Args:
        file: Image file to analyze
        confidence_threshold: Minimum confidence score (0.0-1.0)
        max_predictions: Maximum number of predictions to return
        api_key: API key for authentication
    
    Returns:
        PredictionResponse with predictions and metadata
    """
    start_time = time.time()
    request_id = f"req_{int(time.time() * 1000)}"
    
    logger.info(
        "Prediction request started",
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
            target_size=(224, 224)
        )
        
        # Make prediction
        with PREDICTION_DURATION.time():
            predictions = await ai_service.predict(
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
            confidence_threshold=confidence_threshold
        )
        
        # Log analytics in background
        background_tasks.add_task(
            log_prediction_analytics,
            request_id,
            len(predictions),
            response.processing_time
        )
        
        logger.info(
            "Prediction completed",
            request_id=request_id,
            predictions_count=len(predictions)
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        ERROR_COUNTER.labels(error_type='prediction_error').inc()
        logger.error("Prediction failed", request_id=request_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/batch", response_model=List[PredictionResponse])
async def predict_parts_batch(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    confidence_threshold: float = 0.5,
    max_predictions: int = 5,
    api_key: str = Depends(verify_api_key)
):
    """Batch prediction endpoint for multiple images."""
    if len(files) > 10:  # Limit batch size
        raise HTTPException(
            status_code=400,
            detail="Batch size cannot exceed 10 images"
        )
    
    # Process all images concurrently
    tasks = [
        predict_single_image(file, confidence_threshold, max_predictions)
        for file in files
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Handle results and exceptions
    responses = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.error(f"Batch prediction failed for image {i}", error=str(result))
            # Could add partial failure handling here
        else:
            responses.append(result)
    
    return responses

async def predict_single_image(
    file: UploadFile,
    confidence_threshold: float,
    max_predictions: int
) -> PredictionResponse:
    """Helper function for single image prediction."""
    # Implementation similar to predict_part but without HTTP specifics
    pass

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
        event_type="prediction_analytics"
    )

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
            "request_id": getattr(exc, 'request_id', None)
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
            "message": "An unexpected error occurred"
        }
    )

# AI-based part prediction endpoints
@app.post("/predict/image")
async def predict_from_image(
    file: UploadFile = File(...),
    confidence_threshold: float = Query(default=0.5, ge=0.0, le=1.0),
    include_external_search: bool = Query(default=True),
    api_key: str = Depends(verify_api_key)
):
    """
    Predict part information from uploaded image using AI.
    Optionally includes external database search for additional part details.
    """
    if not ai_service:
        raise HTTPException(status_code=503, detail="AI service not initialized")
    
    try:
        # Read image data first
        image_data = await file.read()
        
        # Process image with AI + Google refinement if enabled
        if include_external_search:
            # Use Google-refined predictions
            import cv2
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            refined_predictions = await ai_service.predict_with_google_refinement(
                image=image,
                confidence_threshold=confidence_threshold,
                max_predictions=5
            )
            
            prediction = {
                "predictions": [
                    {
                        "class_name": pred.class_name,
                        "confidence": pred.confidence,
                        "part_number": pred.part_number,
                        "description": pred.description,
                        "category": pred.category,
                        "manufacturer": pred.manufacturer,
                        "estimated_price": pred.estimated_price,
                        "google_validation": getattr(pred, 'google_validation', None)
                    }
                    for pred in refined_predictions
                ]
            }
            logger.info(f"Used Google-refined predictions for enhanced accuracy")
        else:
            # Use regular AI predictions
            await file.seek(0)  # Reset file pointer
            prediction = await ai_service.predict_from_image(
                file, 
                confidence_threshold=confidence_threshold
            )

        
        return prediction
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Simplified part search endpoints (external APIs disabled)
@app.get("/parts/search/number/{part_number}")
async def search_part_by_number(
    part_number: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Search for parts by part number (simplified - external APIs disabled).
    """
    logger.info(f"Part search requested for: {part_number}")
    return {
        "part_number": part_number,
        "total_results": 0,
        "results": [],
        "message": "External part databases temporarily disabled"
    }

@app.get("/parts/search/description")
async def search_part_by_description(
    description: str = Query(..., min_length=3),
    api_key: str = Depends(verify_api_key)
):
    """
    Search for parts by description (simplified - external APIs disabled).
    """
    logger.info(f"Description search requested: {description}")
    return {
        "description": description,
        "total_results": 0,
        "results": [],
        "message": "External part databases temporarily disabled"
    }

@app.get("/parts/details/{part_number}")
async def get_part_details(
    part_number: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Get detailed information for a specific part (simplified - external APIs disabled).
    """
    logger.info(f"Part details requested for: {part_number}")
    return {
        "part_number": part_number,
        "message": "External part databases temporarily disabled"
    }

@app.get("/providers")
async def get_available_providers(api_key: str = Depends(verify_api_key)):
    """
    Get list of available external database providers (currently none configured).
    """
    return {
        "providers": [],
        "total_configured": 0,
        "message": "External part databases temporarily disabled"
    }

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_config=None,  # Use our structured logging
        access_log=False   # Disable default access logs
    ) 