import os
import uuid
import logging
import json
import asyncio
import sys
import signal
from typing import Dict, Any, Optional, List
import time

import uvicorn
from fastapi import (
    FastAPI, 
    File, 
    UploadFile, 
    HTTPException, 
    BackgroundTasks,
    Query
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY
from pydantic import BaseModel

from dotenv import load_dotenv

from .services.ai_service import analyze_part_image
from .core.config import settings

class KeywordSearchRequest(BaseModel):
    keywords: Optional[List[str]] = None

# Enhanced logging configuration
def configure_logging():
    """
    Configure logging with enhanced thread-safe and interrupt-resistant setup
    """
    # Create a custom log formatter
    formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Configure root logger
    logging.basicConfig(level=logging.INFO)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    
    # File handler with rotation-like behavior
    try:
        log_dir = os.path.join(os.getcwd(), 'logs')
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, 'app.log')
        
        # Rotate log if it gets too large
        if os.path.exists(log_file) and os.path.getsize(log_file) > 10 * 1024 * 1024:  # 10 MB
            backup_file = os.path.join(log_dir, f'app_{int(time.time())}.log')
            os.rename(log_file, backup_file)
        
        file_handler = logging.FileHandler(log_file, mode='a', encoding='utf-8')
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.DEBUG)
    except Exception as e:
        print(f"Could not set up file logging: {e}")
        file_handler = logging.NullHandler()
    
    # Get the root logger and add handlers
    root_logger = logging.getLogger()
    
    # Remove existing handlers to prevent duplicate logs
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    
    # Suppress overly verbose logs from libraries
    logging.getLogger('uvicorn').setLevel(logging.WARNING)
    logging.getLogger('uvicorn.access').setLevel(logging.WARNING)
    logging.getLogger('uvicorn.error').setLevel(logging.WARNING)
    logging.getLogger('fastapi').setLevel(logging.WARNING)
    logging.getLogger('openai').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)

# Configure logging before app initialization
configure_logging()
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize FastAPI app with explicit lifespan management
app = FastAPI(
    title="SpareFinderAI Service",
    description="AI-powered automotive part identification service",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# In-memory storage for analysis results (replace with Redis/database in production)
analysis_results: Dict[str, Dict[str, Any]] = {}

# Custom exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "status": "failed",
            "error": "Validation Error",
            "details": str(exc)
        }
    )

# Estimated Price Model
class EstimatedPrice(BaseModel):
    new: str
    used: str
    refurbished: str

# Technical Data Sheet Model  
class TechnicalDataSheet(BaseModel):
    part_type: str
    material: str
    common_specs: str
    load_rating: str
    weight: str
    reusability: str
    finish: str
    temperature_tolerance: str

# Supplier Information Model
class SupplierInfo(BaseModel):
    name: str
    url: str
    price_range: Optional[str] = ""
    shipping_region: Optional[str] = ""
    contact: Optional[str] = ""

# Flat Analysis Response Model
class AnalysisResponse(BaseModel):
    success: bool
    status: str
    filename: Optional[str] = None
    class_name: Optional[str] = None
    category: Optional[str] = None
    precise_part_name: Optional[str] = None
    material_composition: Optional[str] = None
    manufacturer: Optional[str] = None
    confidence_score: Optional[int] = None
    confidence_explanation: Optional[str] = None
    estimated_price: Optional[EstimatedPrice] = None
    description: Optional[str] = None
    technical_data_sheet: Optional[TechnicalDataSheet] = None
    compatible_vehicles: Optional[List[str]] = None
    engine_types: Optional[List[str]] = None
    buy_links: Optional[Dict[str, str]] = None
    suppliers: Optional[List[SupplierInfo]] = None
    fitment_tips: Optional[str] = None
    additional_instructions: Optional[str] = None
    full_analysis: Optional[str] = None
    processing_time_seconds: Optional[float] = None
    model_version: Optional[str] = None
    error: Optional[str] = None

# Graceful shutdown handler
def graceful_shutdown(signum, frame):
    """Handle graceful shutdown signals"""
    logger.info(f"Received signal {signum}. Initiating graceful shutdown...")
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, graceful_shutdown)
signal.signal(signal.SIGTERM, graceful_shutdown)

# Startup event to ensure directories are created
@app.on_event("startup")
async def startup_event():
    try:
        # Ensure uploads directory exists
        uploads_dir = os.path.join(os.getcwd(), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        logger.info(f"Uploads directory ensured: {uploads_dir}")
        
        # Additional startup checks can be added here
    except Exception as e:
        logger.error(f"Startup event error: {e}")
        # Optionally raise a critical error that prevents app startup
        raise RuntimeError(f"Critical startup failure: {e}")

# Shutdown event for cleanup
@app.on_event("shutdown")
async def shutdown_event():
    try:
        logger.info("Initiating application shutdown")
        
        # Clear analysis results safely
        if analysis_results:
            logger.info(f"Clearing {len(analysis_results)} analysis results")
            analysis_results.clear()
        
        # Optional: Clean up upload directory
        uploads_dir = os.path.join(os.getcwd(), "uploads")
        try:
            for filename in os.listdir(uploads_dir):
                file_path = os.path.join(uploads_dir, filename)
                if os.path.isfile(file_path):
                    try:
                        os.unlink(file_path)
                    except Exception as file_error:
                        logger.warning(f"Could not delete file {filename}: {file_error}")
            logger.info("Cleaned up temporary upload files")
        except Exception as cleanup_error:
            logger.warning(f"Error during upload directory cleanup: {cleanup_error}")
        
        logger.info("Application shutdown completed successfully")
    except Exception as e:
        logger.error(f"Error during application shutdown: {e}")
    finally:
        # Ensure logging is flushed
        logging.shutdown()

@app.post("/search/keywords")
async def search_by_keywords(payload: KeywordSearchRequest):
    try:
        if not payload.keywords or (isinstance(payload.keywords, list) and len(payload.keywords) == 0):
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Invalid request",
                    "message": "Please provide one or more keywords"
                }
            )

        # Normalize keywords
        normalized = [str(k).strip().lower() for k in (payload.keywords or []) if str(k).strip()]

        # Mock searchable catalog (can be replaced with real search integration)
        catalog = [
            {"part_number": "BP-001-2024", "name": "Brake Pad Set", "category": "Braking System", "manufacturer": "AutoParts Inc", "price": 45.99, "availability": "In Stock"},
            {"part_number": "AF-002-2024", "name": "Air Filter", "category": "Engine", "manufacturer": "FilterTech", "price": 19.99, "availability": "Limited Stock"},
            {"part_number": "OF-010-2023", "name": "Oil Filter", "category": "Engine", "manufacturer": "LubePro", "price": 12.49, "availability": "In Stock"},
            {"part_number": "SP-050-2022", "name": "Spark Plug", "category": "Ignition", "manufacturer": "IgniteX", "price": 8.99, "availability": "In Stock"},
            {"part_number": "RT-700-2021", "name": "Radiator", "category": "Cooling System", "manufacturer": "CoolFlow", "price": 129.99, "availability": "Backordered"}
        ]

        # Simple keyword match across key fields
        def matches(item: Dict[str, Any]) -> bool:
            text = " ".join([
                str(item.get("name", "")),
                str(item.get("category", "")),
                str(item.get("manufacturer", "")),
                str(item.get("part_number", "")),
            ]).lower()
            return any(k in text for k in normalized)

        results = [item for item in catalog if matches(item)]

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "results": results,
                "total": len(results),
                "query": {"keywords": normalized}
            }
        )
    except Exception as e:
        logger.error(f"Keyword search error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Search failed",
                "message": str(e)
            }
        )

@app.post("/analyze-part/")
async def analyze_part(
    file: UploadFile = File(...),
    keywords: Optional[str] = Query(None),
    confidence_threshold: float = Query(0.3),
    max_predictions: int = Query(3)
):
    filename = None
    try:
        # Generate unique filename
        filename = f"{uuid.uuid4()}.{file.filename.split('.')[-1]}"
        file_path = os.path.join("uploads", filename)
        
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        logger.info(f"File saved: {filename}")
        
        # Prepare keywords
        keyword_list = keywords.split(", ") if keywords else []
        
        # Start async analysis with timeout
        try:
            analysis_result = await asyncio.wait_for(
                analyze_part_image(
                    file_path, 
                    keywords=keyword_list, 
                    confidence_threshold=confidence_threshold,
                    max_predictions=max_predictions
                ),
                timeout=300.0  # 5-minute timeout
            )
        except asyncio.TimeoutError:
            logger.error(f"Analysis timed out for {filename}")
            return JSONResponse(
                status_code=504,  # Gateway Timeout
                content={
                    "success": False,
                    "status": "failed",
                    "error": "Analysis timed out",
                    "filename": filename
                }
            )
        
        # If analysis failed, return error response (now already in flat format)
        if not analysis_result.get('success'):
            # Add filename to the flat error response
            analysis_result["filename"] = filename
            return JSONResponse(
                status_code=500,
                content=analysis_result
            )
        
        # Analysis successful - add filename to the flat response
        response_data = {
            "filename": filename,
            **analysis_result  # Merge all flat analysis fields
        }
        
        # Store result for potential later retrieval
        analysis_results[filename] = response_data
        
        logger.info(f"Analysis completed for {filename}")
        
        return JSONResponse(
            status_code=200, 
            content=response_data
        )
    
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "status": "failed",
                "error": str(e),
                "filename": filename if filename else None
            }
        )

@app.get("/analyze-part/status/{filename}")
async def get_analysis_status(
    filename: str,
    confidence_threshold: float = Query(0.3),
    max_predictions: int = Query(3)
):
    try:
        # Check if result exists
        if filename not in analysis_results:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "status": "not_found",
                    "error": "Analysis not found or expired",
                    "filename": filename
                }
            )
        
        # Retrieve stored result (now in flat format)
        result = analysis_results[filename]
        
        # Return the stored flat result
        return JSONResponse(
            status_code=200,
            content=result
        )
    
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "status": "failed",
                "error": str(e),
                "filename": filename
            }
        )

@app.delete("/analyze-part/cleanup/{filename}")
async def cleanup_analysis(filename: str):
    try:
        # Remove file from uploads
        file_path = os.path.join("uploads", filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Remove from analysis results
        if filename in analysis_results:
            del analysis_results[filename]
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "status": "cleaned",
                "filename": filename
            }
        )
    except Exception as e:
        logger.error(f"Cleanup error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "status": "failed",
                "error": str(e),
                "filename": filename
            }
        )

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SpareFinderAI",
        "version": "1.0.0"
    }

# If running the script directly
if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True
    ) 