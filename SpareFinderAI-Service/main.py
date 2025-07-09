import os
import uuid
import logging
import json
from typing import Dict, Any, Optional, List

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
from pydantic import BaseModel

from dotenv import load_dotenv

# Import the analysis function
from github_ai_part_analysis import OpenAIImageAnalyzer

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Part Analysis Service")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"]   # Allows all headers
)

# In-memory storage for analysis results (replace with Redis/database in production)
analysis_results: Dict[str, Dict[str, Any]] = {}

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

# Initialize AI Analyzer
ai_analyzer = OpenAIImageAnalyzer()

@app.post("/analyze-part/")
async def analyze_part(
    file: UploadFile = File(...),
    keywords: Optional[str] = Query(None),
    confidence_threshold: float = Query(0.3),
    max_predictions: int = Query(3)
):
    try:
        # Generate unique filename
        filename = f"{uuid.uuid4()}.{file.filename.split('.')[-1]}"
        file_path = os.path.join("uploads", filename)
        
        # Ensure uploads directory exists
        os.makedirs("uploads", exist_ok=True)
        
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        logger.info(f"File saved: {filename}")
        
        # Prepare keywords
        keyword_list = keywords.split(", ") if keywords else []
        
        # Start async analysis
        analysis_result = await ai_analyzer.analyze_image(
            file_path, 
            keywords=keyword_list, 
            confidence_threshold=confidence_threshold,
            max_predictions=max_predictions
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
            "model_version": "GitHub AI Part Analysis v1.0"
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
                "filename": filename if 'filename' in locals() else None
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

# Cleanup endpoint to remove old analysis results
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
                "message": "File and analysis result cleaned up"
            }
        )
    except Exception as e:
        logger.error(f"Cleanup error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e)
            }
        )

@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring service availability.
    Returns a 200 OK status if the service is running.
    """
    try:
        # You can add additional checks here if needed
        # For example, check database connection, model loading, etc.
        return {
            "status": "healthy",
            "message": "SpareFinderAI Service is running",
            "version": "1.0.0"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Main entry point
if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True
    ) 