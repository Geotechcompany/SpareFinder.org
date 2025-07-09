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

# Prediction Model
class PartPrediction(BaseModel):
    class_name: str
    confidence: float
    description: str
    category: Optional[str] = None
    manufacturer: Optional[str] = None
    estimated_price: Optional[str] = None
    part_number: Optional[str] = None
    compatibility: Optional[List[str]] = None

# Analysis Response Model
class AnalysisResponse(BaseModel):
    success: bool
    status: str
    filename: Optional[str] = None
    predictions: Optional[List[PartPrediction]] = None
    analysis: Optional[str] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None
    model_version: Optional[str] = None

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
        
        # If analysis failed, return error response
        if not analysis_result.get('success'):
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "status": "failed",
                    "error": analysis_result.get('error', 'Unknown error'),
                    "filename": filename
                }
            )
        
        # Prepare response
        response_data = {
            "success": True,
            "status": "completed",
            "filename": filename,
            "predictions": [
                {
                    "class_name": pred.get("class_name", "Unknown Part"),
                    "confidence": pred.get("confidence", 0.0),
                    "description": pred.get("description", ""),
                    "category": pred.get("category"),
                    "manufacturer": pred.get("manufacturer"),
                    "estimated_price": pred.get("estimated_price"),
                    "part_number": pred.get("part_number"),
                    "compatibility": pred.get("compatibility", [])
                } for pred in analysis_result.get("predictions", [])
            ],
            "analysis": analysis_result.get("full_analysis", ""),
            "processing_time": analysis_result.get("processing_time"),
            "model_version": "SpareFinderAI Part Analysis v1.0"
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
        
        # Retrieve stored result
        result = analysis_results[filename]
        
        # Return the stored result
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