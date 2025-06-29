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
from app.services.web_scraper import automotive_scraper
from app.services.database_service import database_service, log_ai_prediction
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
WEB_SCRAPING_COUNTER = Counter('web_scraping_total', 'Total web scraping requests')
WEB_SCRAPING_DURATION = Histogram('web_scraping_duration_seconds', 'Time spent on web scraping')
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
    
    logger.info("Starting AI Part Finder Service with Google Vision and Web Scraping...")
    
    try:
        # Initialize services
        ai_service = AIService()
        image_processor = ImageProcessor()
        
        # Load Google Vision service
        await ai_service.load_model()
        logger.info("Google Vision service initialized successfully")
        
        # Log web scraping configuration
        if settings.is_web_scraping_enabled:
            logger.info(f"Web scraping enabled for {settings.MAX_SCRAPING_SITES} sites max")
        else:
            logger.info("Web scraping disabled")
        
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
    title="AI Part Finder Service - Google Vision + Web Scraping",
    description="Google Vision API powered automotive part identification with web scraping enhancement",
    version="2.0.0",
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
        "service": "Google Vision + Web Scraping",
        "version": "2.0.0"
    }

@app.get("/health/ready")
async def readiness_check():
    """Readiness check - ensures Google Vision service is ready."""
    if not ai_service or not ai_service.is_ready():
        raise HTTPException(status_code=503, detail="Google Vision service not ready")
    
    return {
        "status": "ready", 
        "google_vision_ready": True,
        "web_scraping_enabled": settings.is_web_scraping_enabled,
        "max_scraping_sites": settings.MAX_SCRAPING_SITES
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
        logger.info(f"Received API key: {api_key}")
        logger.info(f"Expected API key: {settings.API_KEY}")
        
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
    include_web_scraping: bool = Query(default=True, description="Include web scraping for enhanced results"),
    api_key: str = Depends(verify_api_key)
):
    """
    Main prediction endpoint for automotive parts using Google Vision API.
    
    Args:
        file: Image file to analyze (JPEG, PNG, WebP)
        confidence_threshold: Minimum confidence for predictions (0.0-1.0)
        max_predictions: Maximum number of predictions to return
        include_web_scraping: Whether to enhance results with web scraping
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
        content_type=file.content_type,
        web_scraping_enabled=include_web_scraping and settings.is_web_scraping_enabled
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
        
        # Make prediction with Google Vision + optional web scraping
        similar_images = []
        with PREDICTION_DURATION.time():
            if include_web_scraping and settings.is_web_scraping_enabled:
                # Enhanced prediction with web scraping
                predictions, similar_images = await ai_service.predict_with_web_scraping(
                    processed_image,
                    confidence_threshold=confidence_threshold,
                    max_predictions=max_predictions,
                    include_scraping=True
                )
                logger.info("Used Google Vision + web scraping for enhanced results")
            else:
                # Regular Google Vision prediction
                predictions = await ai_service.predict(
                    processed_image,
                    confidence_threshold=confidence_threshold,
                    max_predictions=max_predictions
                )
                logger.info("Used Google Vision only")
        
        PREDICTION_COUNTER.inc()
        
        # Create response
        response = PredictionResponse(
            request_id=request_id,
            predictions=predictions,
            processing_time=time.time() - start_time,
            model_version=ai_service.get_model_version(),
            confidence_threshold=confidence_threshold,
            similar_images=similar_images if similar_images else None,
            image_metadata={
                "filename": file.filename,
                "content_type": file.content_type,
                "size_bytes": len(image_data),
                "processed_with": "Google Vision API",
                "web_scraping_used": include_web_scraping and settings.is_web_scraping_enabled
            }
        )
        
        # Log analytics in background
        background_tasks.add_task(
            log_prediction_analytics,
            request_id,
            len(predictions),
            response.processing_time,
            include_web_scraping and settings.is_web_scraping_enabled
        )
        
        # Log to database in background (if user_id is available from headers)
        user_id = None  # TODO: Extract from JWT token or request headers if available
        if database_service.is_enabled():
            background_tasks.add_task(
                log_ai_prediction,
                request_id=request_id,
                predictions=[pred.dict() for pred in predictions],
                processing_time=response.processing_time,
                model_version=ai_service.get_model_version(),
                similar_images=[img for img in (similar_images or [])],
                web_scraping_used=include_web_scraping and settings.is_web_scraping_enabled,
                user_id=user_id,
                image_metadata={
                    "filename": file.filename,
                    "content_type": file.content_type,
                    "size_bytes": len(image_data)
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

# Web scraping endpoint
@app.post("/parts/search/scrape")
async def search_parts_with_scraping(
    part_name: str = Query(..., min_length=3, description="Part name to search for"),
    max_sites: int = Query(default=5, ge=1, le=10, description="Maximum sites to scrape"),
    api_key: str = Depends(verify_api_key)
):
    """
    Search for automotive parts using web scraping across multiple sites.
    
    Args:
        part_name: Name of the part to search for
        max_sites: Maximum number of sites to scrape (1-10)
        api_key: API key for authentication
    
    Returns:
        List of part information from various automotive websites
    """
    if not settings.is_web_scraping_enabled:
        raise HTTPException(
            status_code=503,
            detail="Web scraping is disabled"
        )
    
    start_time = time.time()
    request_id = f"scrape_req_{int(time.time() * 1000)}"
    
    logger.info(
        "Web scraping request started",
        request_id=request_id,
        part_name=part_name,
        max_sites=max_sites
    )
    
    try:
        with WEB_SCRAPING_DURATION.time():
            search_results = await automotive_scraper.search_parts(
                part_name=part_name,
                max_sites=min(max_sites, settings.MAX_SCRAPING_SITES)
            )
        
        WEB_SCRAPING_COUNTER.inc()
        
        processing_time = time.time() - start_time
        
        logger.info(
            "Web scraping completed",
            request_id=request_id,
            results_found=len(search_results),
            processing_time=processing_time
        )
        
        return {
            "request_id": request_id,
            "part_name": part_name,
            "total_results": len(search_results),
            "processing_time": processing_time,
            "results": search_results,
            "metadata": {
                "sites_scraped": max_sites,
                "scraping_enabled": True,
                "timestamp": time.time()
            }
        }
        
    except Exception as e:
        ERROR_COUNTER.labels(error_type='web_scraping_error').inc()
        logger.error(
            "Web scraping failed",
            request_id=request_id,
            part_name=part_name,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Web scraping failed: {str(e)}")

@app.post("/predict/batch", response_model=List[PredictionResponse])
async def predict_parts_batch(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    confidence_threshold: float = 0.5,
    max_predictions: int = 5,
    include_web_scraping: bool = Query(default=False, description="Include web scraping (slower for batch)"),
    api_key: str = Depends(verify_api_key)
):
    """Batch prediction endpoint for multiple images with Google Vision."""
    if len(files) > 10:  # Limit batch size
        raise HTTPException(
            status_code=400,
            detail="Batch size cannot exceed 10 images"
        )
    
    logger.info(f"Starting batch prediction for {len(files)} images")
    
    # Process all images concurrently
    tasks = [
        predict_single_image(
            file, 
            confidence_threshold, 
            max_predictions,
            include_web_scraping
        )
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
    max_predictions: int,
    include_web_scraping: bool = False
) -> PredictionResponse:
    """Helper function for single image prediction with Google Vision."""
    start_time = time.time()
    request_id = f"batch_google_vision_req_{int(time.time() * 1000)}_{id(file)}"
    
    try:
        # Read and process image
        image_data = await file.read()
        processed_image = await image_processor.process_image(
            image_data,
            target_size=(512, 512)
        )
        
        # Make prediction
        similar_images = []
        if include_web_scraping and settings.is_web_scraping_enabled:
            predictions, similar_images = await ai_service.predict_with_web_scraping(
                processed_image,
                confidence_threshold=confidence_threshold,
                max_predictions=max_predictions,
                include_scraping=True
            )
        else:
            predictions = await ai_service.predict(
                processed_image,
                confidence_threshold=confidence_threshold,
                max_predictions=max_predictions
            )
        
        return PredictionResponse(
            request_id=request_id,
            predictions=predictions,
            processing_time=time.time() - start_time,
            model_version=ai_service.get_model_version(),
            confidence_threshold=confidence_threshold,
            similar_images=similar_images if similar_images else None
        )
        
    except Exception as e:
        logger.error(f"Single image prediction failed", request_id=request_id, error=str(e))
        raise e

async def log_prediction_analytics(
    request_id: str,
    predictions_count: int,
    processing_time: float,
    web_scraping_used: bool = False
):
    """Log analytics data for monitoring and optimization."""
    logger.info(
        "Analytics data",
        request_id=request_id,
        predictions_count=predictions_count,
        processing_time=processing_time,
        web_scraping_used=web_scraping_used,
        model_type="google_vision",
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
            "service": "Google Vision API + Web Scraping"
        }
    )

# Enhanced AI-based part prediction endpoints
@app.post("/predict/image")
async def predict_from_image(
    file: UploadFile = File(...),
    confidence_threshold: float = Query(default=0.5, ge=0.0, le=1.0),
    include_web_scraping: bool = Query(default=True, description="Include web scraping for enhanced results"),
    max_scraping_sites: int = Query(default=3, ge=1, le=5, description="Max sites to scrape"),
    api_key: str = Depends(verify_api_key)
):
    """
    Predict part information from uploaded image using Google Vision.
    Enhanced with web scraping from automotive parts websites for real market data.
    """
    if not ai_service:
        raise HTTPException(status_code=503, detail="Google Vision service not initialized")
    
    start_time = time.time()
    request_id = f"enhanced_google_vision_req_{int(time.time() * 1000)}"
    
    try:
        # Read image data
        image_data = await file.read()
        
        # Process with Google Vision + web scraping enhancement
        if include_web_scraping and settings.is_web_scraping_enabled:
            # Convert image for processing
            import cv2
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Get enhanced predictions with web scraping
            enhanced_predictions, similar_images = await ai_service.predict_with_web_scraping(
                image=image,
                confidence_threshold=confidence_threshold,
                max_predictions=5,
                include_scraping=True
            )
            
            prediction_data = {
                "request_id": request_id,
                "processing_time": time.time() - start_time,
                "model_version": ai_service.get_model_version(),
                "enhancement_type": "Google Vision + Web Scraping",
                "similar_images": similar_images,
                "predictions": [
                    {
                        "class_name": pred.class_name,
                        "confidence": pred.confidence,
                        "part_number": pred.part_number,
                        "description": pred.description,
                        "category": pred.category,
                        "manufacturer": pred.manufacturer,
                        "estimated_price": pred.estimated_price,
                        "compatibility": pred.compatibility,
                        "market_validation": getattr(pred, 'google_validation', None)
                    }
                    for pred in enhanced_predictions
                ]
            }
            
            logger.info(
                "Enhanced Google Vision prediction with web scraping completed",
                request_id=request_id,
                predictions_count=len(enhanced_predictions)
            )
        else:
            # Use regular Google Vision predictions
            await file.seek(0)  # Reset file pointer
            prediction_result = await ai_service.predict_from_image(
                file, 
                confidence_threshold=confidence_threshold
            )
            
            prediction_data = {
                "request_id": request_id,
                "processing_time": time.time() - start_time,
                "model_version": ai_service.get_model_version(),
                "enhancement_type": "Google Vision Only",
                **prediction_result
            }
            
            logger.info(
                "Google Vision prediction completed",
                request_id=request_id,
                predictions_count=len(prediction_result.get("predictions", []))
            )

        return prediction_data
        
    except Exception as e:
        logger.error(f"Enhanced prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Image download and processing endpoints
@app.post("/images/download")
async def download_part_image(
    image_url: str = Query(..., description="URL of the image to download"),
    max_size_mb: int = Query(default=5, ge=1, le=10, description="Maximum image size in MB"),
    return_base64: bool = Query(default=False, description="Return image as base64 string"),
    api_key: str = Depends(verify_api_key)
):
    """
    Download a part image from a URL found in web scraping results.
    
    Args:
        image_url: URL of the image to download
        max_size_mb: Maximum allowed file size in MB
        return_base64: Whether to return the image as base64 encoded string
        api_key: API key for authentication
    
    Returns:
        Image data or metadata
    """
    if not settings.is_web_scraping_enabled:
        raise HTTPException(
            status_code=503,
            detail="Image downloading requires web scraping to be enabled"
        )
    
    start_time = time.time()
    request_id = f"img_download_req_{int(time.time() * 1000)}"
    
    logger.info(
        "Image download request started",
        request_id=request_id,
        image_url=image_url,
        max_size_mb=max_size_mb
    )
    
    try:
        if return_base64:
            # Download and return as base64
            base64_image = await automotive_scraper.get_image_as_base64(image_url, max_size_mb)
            
            if not base64_image:
                raise HTTPException(
                    status_code=404,
                    detail="Image could not be downloaded or is invalid"
                )
            
            # Get image metadata
            metadata = await automotive_scraper._get_image_metadata(image_url)
            
            return {
                "request_id": request_id,
                "image_url": image_url,
                "image_base64": base64_image,
                "metadata": metadata,
                "processing_time": time.time() - start_time,
                "format": "base64"
            }
        else:
            # Download raw image data
            image_data = await automotive_scraper.download_image(image_url, max_size_mb)
            
            if not image_data:
                raise HTTPException(
                    status_code=404,
                    detail="Image could not be downloaded or is invalid"
                )
            
            # Get image metadata
            metadata = await automotive_scraper._get_image_metadata(image_url)
            
            # Return image as streaming response
            from fastapi.responses import StreamingResponse
            import io
            
            def generate():
                yield image_data
            
            return StreamingResponse(
                io.BytesIO(image_data),
                media_type=metadata.get('content_type', 'image/jpeg'),
                headers={
                    "X-Request-ID": request_id,
                    "X-Image-URL": image_url,
                    "X-Processing-Time": str(time.time() - start_time),
                    "X-Image-Size": str(len(image_data)),
                    "Content-Disposition": f"attachment; filename=part_image_{request_id}.jpg"
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Image download failed",
            request_id=request_id,
            image_url=image_url,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Image download failed: {str(e)}")

@app.post("/images/batch-download")
async def batch_download_images(
    image_urls: List[str] = Query(..., description="List of image URLs to download"),
    max_size_mb: int = Query(default=5, ge=1, le=10, description="Maximum image size in MB per image"),
    max_images: int = Query(default=10, ge=1, le=20, description="Maximum number of images to download"),
    return_base64: bool = Query(default=True, description="Return images as base64 strings"),
    api_key: str = Depends(verify_api_key)
):
    """
    Download multiple part images from URLs found in web scraping results.
    
    Args:
        image_urls: List of image URLs to download
        max_size_mb: Maximum allowed file size in MB per image
        max_images: Maximum number of images to process
        return_base64: Whether to return images as base64 encoded strings
        api_key: API key for authentication
    
    Returns:
        List of downloaded images with metadata
    """
    if not settings.is_web_scraping_enabled:
        raise HTTPException(
            status_code=503,
            detail="Batch image downloading requires web scraping to be enabled"
        )
    
    # Limit the number of URLs
    limited_urls = image_urls[:max_images]
    
    start_time = time.time()
    request_id = f"batch_img_req_{int(time.time() * 1000)}"
    
    logger.info(
        "Batch image download request started",
        request_id=request_id,
        image_count=len(limited_urls),
        max_size_mb=max_size_mb
    )
    
    try:
        # Download images concurrently
        download_tasks = []
        for i, url in enumerate(limited_urls):
            if return_base64:
                task = automotive_scraper.get_image_as_base64(url, max_size_mb)
            else:
                task = automotive_scraper.download_image(url, max_size_mb)
            download_tasks.append((url, task))
        
        # Execute downloads
        results = []
        successful_downloads = 0
        
        for url, task in download_tasks:
            try:
                image_data = await task
                
                if image_data:
                    # Get metadata
                    metadata = await automotive_scraper._get_image_metadata(url)
                    
                    result = {
                        "url": url,
                        "success": True,
                        "metadata": metadata,
                        "format": "base64" if return_base64 else "binary",
                        "size_bytes": metadata.get('size_bytes')
                    }
                    
                    if return_base64:
                        result["image_base64"] = image_data
                    else:
                        result["image_data"] = image_data  # This would be binary data
                    
                    results.append(result)
                    successful_downloads += 1
                else:
                    results.append({
                        "url": url,
                        "success": False,
                        "error": "Failed to download or invalid image",
                        "metadata": None
                    })
                
            except Exception as e:
                logger.warning(f"Failed to download image {url}: {e}")
                results.append({
                    "url": url,
                    "success": False,
                    "error": str(e),
                    "metadata": None
                })
        
        processing_time = time.time() - start_time
        
        logger.info(
            "Batch image download completed",
            request_id=request_id,
            successful_downloads=successful_downloads,
            total_requested=len(limited_urls),
            processing_time=processing_time
        )
        
        return {
            "request_id": request_id,
            "total_requested": len(limited_urls),
            "successful_downloads": successful_downloads,
            "failed_downloads": len(limited_urls) - successful_downloads,
            "processing_time": processing_time,
            "results": results
        }
        
    except Exception as e:
        logger.error(
            "Batch image download failed",
            request_id=request_id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Batch image download failed: {str(e)}")

@app.get("/images/validate")
async def validate_image_url(
    image_url: str = Query(..., description="URL of the image to validate"),
    api_key: str = Depends(verify_api_key)
):
    """
    Validate an image URL without downloading the full image.
    
    Args:
        image_url: URL of the image to validate
        api_key: API key for authentication
    
    Returns:
        Image validation results and metadata
    """
    start_time = time.time()
    request_id = f"img_validate_req_{int(time.time() * 1000)}"
    
    try:
        # Validate URL format
        is_valid_url = automotive_scraper._is_valid_image_url(image_url)
        
        if not is_valid_url:
            return {
                "request_id": request_id,
                "image_url": image_url,
                "is_valid": False,
                "reason": "Invalid URL format or not an image URL",
                "accessible": False,
                "metadata": None,
                "processing_time": time.time() - start_time
            }
        
        # Check if URL is accessible
        is_accessible = await automotive_scraper._validate_image_url(image_url)
        
        metadata = None
        if is_accessible:
            # Get metadata without downloading full image
            metadata = await automotive_scraper._get_image_metadata(image_url)
        
        return {
            "request_id": request_id,
            "image_url": image_url,
            "is_valid": is_valid_url,
            "accessible": is_accessible,
            "metadata": metadata,
            "processing_time": time.time() - start_time,
            "recommendations": {
                "can_download": is_accessible,
                "estimated_size": metadata.get('size_bytes') if metadata else None,
                "format": metadata.get('format') if metadata else None,
                "dimensions": f"{metadata.get('width')}x{metadata.get('height')}" if metadata and metadata.get('width') else None
            }
        }
        
    except Exception as e:
        logger.error(
            "Image validation failed",
            request_id=request_id,
            image_url=image_url,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Image validation failed: {str(e)}")

# Web scraping configuration endpoint
@app.get("/scraping/config")
async def get_scraping_config(api_key: str = Depends(verify_api_key)):
    """Get current web scraping configuration."""
    return {
        "enabled": settings.is_web_scraping_enabled,
        "max_sites": settings.MAX_SCRAPING_SITES,
        "delay_seconds": settings.SCRAPING_DELAY,
        "image_support": {
            "enabled": True,
            "max_download_size_mb": 10,
            "supported_formats": ["JPEG", "PNG", "WebP", "GIF", "BMP"],
            "batch_download_limit": 20,
            "validation_available": True
        },
        "supported_sites": [
            {
                "domain": "ebay.com",
                "name": "eBay Motors",
                "difficulty": "easy",
                "image_support": "excellent"
            },
            {
                "domain": "aliexpress.com",
                "name": "AliExpress Auto Parts",
                "difficulty": "moderate",
                "image_support": "good"
            },
            {
                "domain": "rockauto.com",
                "name": "RockAuto",
                "difficulty": "easy",
                "image_support": "excellent"
            },
            {
                "domain": "carid.com",
                "name": "CarID.com",
                "difficulty": "moderate",
                "image_support": "good"
            },
            {
                "domain": "partsgeek.com",
                "name": "PartsGeek",
                "difficulty": "easy",
                "image_support": "good"
            },
            {
                "domain": "summitracing.com",
                "name": "Summit Racing",
                "difficulty": "easy",
                "image_support": "excellent"
            },
            {
                "domain": "jegs.com",
                "name": "JEGS",
                "difficulty": "easy",
                "image_support": "good"
            },
            {
                "domain": "fcpeuro.com",
                "name": "FCPEuro.com",
                "difficulty": "moderate",
                "image_support": "good"
            },
            {
                "domain": "buyautoparts.com",
                "name": "BuyAutoParts.com",
                "difficulty": "easy",
                "image_support": "good"
            }
        ]
    }

# Legacy endpoints (simplified - external APIs disabled for now)
@app.get("/parts/search/number/{part_number}")
async def search_part_by_number(
    part_number: str,
    include_scraping: bool = Query(default=True, description="Include web scraping"),
    api_key: str = Depends(verify_api_key)
):
    """
    Search for parts by part number using web scraping.
    """
    if include_scraping and settings.is_web_scraping_enabled:
        try:
            search_results = await automotive_scraper.search_parts(
                part_name=part_number,
                max_sites=3
            )
            
            return {
                "part_number": part_number,
                "total_results": len(search_results),
                "results": search_results,
                "search_method": "web_scraping"
            }
        except Exception as e:
            logger.error(f"Web scraping search failed: {e}")
            
    logger.info(f"Part search requested for: {part_number}")
    return {
        "part_number": part_number,
        "total_results": 0,
        "results": [],
        "message": "External part databases disabled, web scraping unavailable"
    }

@app.get("/parts/search/description")
async def search_part_by_description(
    description: str = Query(..., min_length=3),
    include_scraping: bool = Query(default=True, description="Include web scraping"),
    api_key: str = Depends(verify_api_key)
):
    """
    Search for parts by description using web scraping.
    """
    if include_scraping and settings.is_web_scraping_enabled:
        try:
            search_results = await automotive_scraper.search_parts(
                part_name=description,
                max_sites=5
            )
            
            return {
                "description": description,
                "total_results": len(search_results),
                "results": search_results,
                "search_method": "web_scraping"
            }
        except Exception as e:
            logger.error(f"Web scraping search failed: {e}")
    
    logger.info(f"Description search requested: {description}")
    return {
        "description": description,
        "total_results": 0,
        "results": [],
        "message": "External part databases disabled, web scraping unavailable"
    }

@app.get("/parts/details/{part_number}")
async def get_part_details(
    part_number: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Get detailed information for a specific part (simplified).
    """
    logger.info(f"Part details requested for: {part_number}")
    return {
        "part_number": part_number,
        "message": "Detailed part information via external APIs temporarily disabled"
    }

@app.get("/providers")
async def get_available_providers(api_key: str = Depends(verify_api_key)):
    """
    Get list of available service providers.
    """
    return {
        "ai_providers": ["Google Vision"],
        "web_scraping_sites": [
            "eBay Motors",
            "AliExpress Auto Parts", 
            "RockAuto",
            "CarID.com",
            "PartsGeek",
            "Summit Racing",
            "JEGS",
            "FCPEuro.com",
            "BuyAutoParts.com"
        ] if settings.is_web_scraping_enabled else [],
        "external_api_providers": [],
        "total_configured": 1 + (9 if settings.is_web_scraping_enabled else 0),
        "message": "Google Vision + Web Scraping enabled"
    }

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    ) 