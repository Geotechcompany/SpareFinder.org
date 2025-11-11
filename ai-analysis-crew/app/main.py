"""FastAPI main application with WebSocket support for real-time updates."""

import os
import asyncio
import base64
from typing import Optional
import warnings
import logging

# Suppress deprecation warnings
warnings.filterwarnings('ignore', category=UserWarning)
warnings.filterwarnings('ignore', category=DeprecationWarning)

# Disable CrewAI telemetry
os.environ['OTEL_SDK_DISABLED'] = 'true'

# Setup logger
logger = logging.getLogger(__name__)

from fastapi import FastAPI, File, Form, UploadFile, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import uvicorn
from .crew_setup import setup_crew, set_progress_emitter, emit_progress, generate_report_tool_func, send_email_tool_func
from .utils import ensure_temp_dir
from .vision_analyzer import get_image_description
from .database_storage import store_crew_analysis_to_database, update_crew_job_status, complete_crew_job

app = FastAPI(
    title="AI Spare Part Analyzer API",
    description="AI-powered manufacturer part identification, research, and supplier discovery",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"Error sending message: {e}")
    
    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting: {e}")
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()


def create_progress_emitter(websocket: WebSocket):
    """Create a progress emitter function for a specific WebSocket."""
    async def emit(stage: str, message: str, status: str = "in_progress"):
        await manager.send_personal_message({
            "stage": stage,
            "message": message,
            "status": status,
            "timestamp": asyncio.get_event_loop().time()
        }, websocket)
    return emit


@app.on_event("startup")
async def startup_event():
    """Initialize on startup."""
    ensure_temp_dir()


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AI Spare Part Analyzer API",
        "status": "running",
        "version": "2.0.0",
        "endpoints": {
            "health": "/health",
            "websocket": "/ws/progress"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": "AI Spare Part Analyzer API",
        "timestamp": datetime.now().isoformat()
    }


async def run_analysis_background(
    analysis_id: str,
    user_email: str,
    image_data: Optional[bytes],
    keywords: Optional[str]
):
    """Run the Deep Research in the background and update database."""
    try:
        # Update status to processing - Image Analysis stage
        update_crew_job_status(analysis_id, "processing", "image_analysis", 10)
        
        # Pre-analyze image with GPT-4o Vision if image is provided
        if image_data:
            detailed_description = get_image_description(image_data, keywords)
            update_crew_job_status(analysis_id, "processing", "part_identifier", 20)
            crew, report_task = setup_crew(None, detailed_description, user_email)
        else:
            update_crew_job_status(analysis_id, "processing", "part_identifier", 15)
            crew, report_task = setup_crew(None, keywords, user_email)
        
        # Run crew execution - Research stage
        update_crew_job_status(analysis_id, "processing", "research_agent", 30)
        
        # Execute crew in a thread pool
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(crew.kickoff)
            result = future.result()
        
        # Supplier Discovery stage
        update_crew_job_status(analysis_id, "processing", "supplier_finder", 70)
        
        # Extract the report_task output directly
        # The report_task contains the full comprehensive report from the Report Compiler agent
        try:
            # After crew.kickoff(), the task's output attribute contains the TaskOutput object
            logger.info(f"🔍 Report task type: {type(report_task)}")
            logger.info(f"🔍 Report task has output: {hasattr(report_task, 'output')}")
            
            # Try to get the output from the report_task directly
            if hasattr(report_task, 'output') and report_task.output:
                # TaskOutput object has raw_output, exported_output, or we can call result()
                if hasattr(report_task.output, 'raw_output'):
                    result_text = str(report_task.output.raw_output)
                    logger.info(f"📄 Used report_task.output.raw_output")
                elif hasattr(report_task.output, 'exported_output'):
                    result_text = str(report_task.output.exported_output)
                    logger.info(f"📄 Used report_task.output.exported_output")
                elif hasattr(report_task.output, 'raw'):
                    result_text = str(report_task.output.raw)
                    logger.info(f"📄 Used report_task.output.raw")
                elif callable(getattr(report_task.output, 'result', None)):
                    result_text = str(report_task.output.result())
                    logger.info(f"📄 Used report_task.output.result()")
                else:
                    result_text = str(report_task.output)
                    logger.info(f"📄 Used report_task.output (str)")
                    
                logger.info(f"📄 Extracted report from Report Compiler task")
                logger.info(f"📄 Report preview (first 200 chars): {result_text[:200]}")
                logger.info(f"📄 Report length: {len(result_text)} chars")
            else:
                # Fallback to full crew result
                result_text = str(result)
                logger.warning(f"⚠️ Could not access report_task.output, using full result")
        except Exception as e:
            logger.error(f"❌ Error extracting report task output: {e}")
            import traceback
            logger.error(traceback.format_exc())
            result_text = str(result)
        
        # Generate PDF report
        pdf_path = generate_report_tool_func(comprehensive_report_text=result_text)
        
        # Extract just the filename for URL storage
        pdf_filename = pdf_path.split('/')[-1] if '/' in pdf_path else pdf_path.split('\\')[-1]
        
        # Report Generation stage
        update_crew_job_status(analysis_id, "processing", "report_generator", 85)
        
        # Upload PDF to Supabase Storage for persistent access
        pdf_public_url = None
        try:
            from .pdf_storage import upload_pdf_to_supabase_storage
            pdf_public_url = upload_pdf_to_supabase_storage(pdf_path, pdf_filename)
            if pdf_public_url:
                logger.info(f"✅ PDF uploaded to Supabase Storage: {pdf_public_url}")
            else:
                logger.warning("⚠️ PDF upload to Supabase Storage failed, using local path")
        except Exception as upload_err:
            logger.error(f"❌ Error uploading PDF: {upload_err}")
        
        # Store to database (jobs and part_searches tables)
        import uuid
        update_crew_job_status(analysis_id, "processing", "database_storage", 90)
        store_crew_analysis_to_database(
            analysis_id=analysis_id,
            user_email=user_email,
            analysis_data={
                'report_text': result_text,
                'processing_time': 180,
                'pdf_path': pdf_filename,
                'pdf_url': pdf_public_url if pdf_public_url else pdf_filename
            },
            image_url=None,
            keywords=keywords
        )
        
        # Email sending stage
        update_crew_job_status(analysis_id, "processing", "email_agent", 95)
        
        # Send email
        logger.info(f"📧 Sending email to {user_email}")
        send_email_tool_func(user_email, pdf_path)
        logger.info(f"✅ Email sent successfully")
        
        # Complete the job - use public URL if available, otherwise filename
        logger.info(f"🏁 Completing job {analysis_id}")
        pdf_url_for_completion = pdf_public_url if pdf_public_url else pdf_filename
        completion_success = complete_crew_job(
            job_id=analysis_id,
            result_data={'report_text': result_text},
            pdf_url=pdf_url_for_completion
        )
        
        if completion_success:
            logger.info(f"✅ Job {analysis_id} marked as completed in database")
        else:
            logger.error(f"❌ Failed to mark job {analysis_id} as completed")
        
    except Exception as e:
        # Mark as failed
        update_crew_job_status(
            analysis_id,
            "failed",
            "error",
            0,
            str(e)
        )
        print(f"❌ Analysis failed: {e}")


@app.post("/analyze-part")
async def analyze_part(
    user_email: str = Form(...),
    analysis_id: Optional[str] = Form(None),
    keywords: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Analyze a car part from image and/or keywords.
    
    This endpoint accepts:
    - user_email: Required email address
    - analysis_id: Optional job ID for tracking (will generate if not provided)
    - keywords: Optional text description
    - file: Optional image file
    
    Note: For real-time progress, connect to /ws/progress WebSocket endpoint.
    """
    try:
        # Read image data if provided
        image_data = None
        if file:
            image_data = await file.read()
        
        # Validate email
        if not user_email or "@" not in user_email:
            return JSONResponse(
                status_code=400,
                content={"error": "Valid email address is required"}
            )
        
        # Generate analysis ID if not provided
        if not analysis_id:
            import uuid
            analysis_id = str(uuid.uuid4())
        
        # Create job entry in database first
        from .database_storage import create_crew_job
        job_created = create_crew_job(
            job_id=analysis_id,
            user_email=user_email,
            keywords=keywords,
            image_url=None  # Image URL will be added later
        )
        
        if not job_created:
            logger.warning(f"⚠️ Failed to create crew job entry for {analysis_id}, but continuing with analysis")
        
        # Start analysis in background
        asyncio.create_task(run_analysis_background(
            analysis_id,
            user_email,
            image_data,
            keywords
        ))
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "Analysis started. Connect to /ws/progress for real-time updates.",
                "email": user_email,
                "analysis_id": analysis_id,
                "has_image": image_data is not None,
                "has_keywords": keywords is not None
            }
        )
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.websocket("/ws/progress")
async def websocket_progress(websocket: WebSocket):
    """WebSocket endpoint for real-time progress updates."""
    await manager.connect(websocket)
    
    try:
        # Wait for client to send analysis request
        data = await websocket.receive_json()
        
        user_email = data.get("email")
        keywords = data.get("keywords")
        image_base64 = data.get("image")  # Client should send base64 encoded image
        
        if not user_email:
            await manager.send_personal_message({
                "stage": "error",
                "message": "Email is required",
                "status": "error"
            }, websocket)
            return
        
        # Set up progress emitter for this connection
        set_progress_emitter(create_progress_emitter(websocket))
        
        # Decode image if provided
        image_data = None
        if image_base64:
            image_data = base64.b64decode(image_base64)
        
        # Pre-analyze image with GPT-4o Vision if image is provided
        if image_data:
            emit_progress("image_analysis", "🔍 Analyzing image with GPT-4o Vision...", "in_progress")
            detailed_description = get_image_description(image_data, keywords)
            emit_progress("image_analysis", "✅ Image analyzed successfully", "completed")
            # Pass the detailed description to CrewAI instead of raw image
            # setup_crew returns a tuple: (crew, report_task)
            crew, report_task = setup_crew(None, detailed_description, user_email)
        else:
            emit_progress("setup", "Initializing AI agents...", "in_progress")
            # setup_crew returns a tuple: (crew, report_task)
            crew, report_task = setup_crew(None, keywords, user_email)
        
        # Emit progress for starting part identification
        emit_progress("part_identifier", "🔍 Part Identifier agent started - analyzing input...", "in_progress")
        
        # Run crew execution
        emit_progress("execution", "Starting analysis workflow...", "in_progress")
        
        # Execute crew (this will trigger progress updates via emit_progress)
        # Run in executor since crew.kickoff() is synchronous
        loop = asyncio.get_event_loop()
        start_time = asyncio.get_event_loop().time()
        result = await loop.run_in_executor(None, crew.kickoff)
        end_time = asyncio.get_event_loop().time()
        processing_time = end_time - start_time
        
        # After crew completes, generate and send the report
        emit_progress("report_generator", "Generating professional PDF from analysis results...", "in_progress")
        
        # Use the complete result text for enhanced report generation
        result_text = str(result)
        
        # Generate enhanced PDF with the complete structured text
        pdf_path = generate_report_tool_func(comprehensive_report_text=result_text)
        
        # Extract just the filename for URL storage
        pdf_filename = pdf_path.split('/')[-1] if '/' in pdf_path else pdf_path.split('\\')[-1]
        
        # Upload PDF to Supabase Storage for persistent access
        emit_progress("database_storage", "📤 Uploading PDF to cloud storage...", "in_progress")
        pdf_public_url = None
        try:
            from .pdf_storage import upload_pdf_to_supabase_storage
            pdf_public_url = upload_pdf_to_supabase_storage(pdf_path, pdf_filename)
            if pdf_public_url:
                emit_progress("database_storage", "✅ PDF uploaded to cloud storage", "completed")
                logger.info(f"✅ PDF uploaded to Supabase Storage: {pdf_public_url}")
            else:
                emit_progress("database_storage", "⚠️ PDF upload skipped (using local file)", "completed")
                logger.warning("⚠️ PDF upload to Supabase Storage failed, using local path")
        except Exception as upload_err:
            logger.error(f"❌ Error uploading PDF: {upload_err}")
            emit_progress("database_storage", "⚠️ PDF upload failed, continuing...", "completed")
        
        # Store to database
        emit_progress("database_storage", "💾 Storing analysis to database...", "in_progress")
        
        # Generate unique analysis ID (proper UUID format for database)
        import uuid
        analysis_id = str(uuid.uuid4())
        
        # Use public URL if available, otherwise use filename
        pdf_url_for_db = pdf_public_url if pdf_public_url else pdf_filename
        
        # Store comprehensive analysis to database
        db_success = store_crew_analysis_to_database(
            analysis_id=analysis_id,
            user_email=user_email,
            analysis_data={
                'report_text': result_text,
                'processing_time': processing_time,
                'pdf_path': pdf_filename,
                'pdf_url': pdf_url_for_db
            },
            image_url=None,  # Could extract from data if available
            keywords=keywords
        )
        
        if db_success:
            emit_progress("database_storage", "✅ Analysis stored to database successfully", "completed")
        else:
            emit_progress("database_storage", "⚠️ Database storage skipped (not configured)", "completed")
        
        # Send email
        email_result = send_email_tool_func(user_email, pdf_path)
        
        # Emit completion
        emit_progress("completion", "✅ Analysis complete! Report sent to your email.", "completed")
        
        # Send final message before closing
        await manager.send_personal_message({
            "stage": "final",
            "message": f"Analysis completed successfully. Report sent to {user_email}",
            "status": "completed",
            "result": "PDF generated and emailed"
        }, websocket)
        
        # Small delay before disconnect to ensure message is sent
        await asyncio.sleep(0.5)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("WebSocket disconnected by client")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        try:
            await manager.send_personal_message({
                "stage": "error",
                "message": f"Error: {str(e)}",
                "status": "error"
            }, websocket)
        except:
            pass  # Connection already closed
        finally:
            manager.disconnect(websocket)


@app.post("/search/keywords/schedule")
async def schedule_keyword_search(request: Request):
    """
    Schedule a keyword-only search (no image required).
    Returns immediately with a job ID for tracking.
    """
    try:
        # Parse JSON body
        body = await request.json()
        keywords_raw = body.get("keywords", "")
        user_email = body.get("user_email", "")
        
        # Handle keywords as either string or array
        if isinstance(keywords_raw, list):
            keywords = " ".join(str(k).strip() for k in keywords_raw if k)
        else:
            keywords = str(keywords_raw).strip() if keywords_raw else ""
        
        # Validate inputs
        if not keywords:
            return JSONResponse(
                status_code=400,
                content={"error": "Keywords are required"}
            )
        
        if not user_email or "@" not in user_email:
            return JSONResponse(
                status_code=400,
                content={"error": "Valid email address is required"}
            )
        
        # Generate unique job ID
        import uuid
        job_id = str(uuid.uuid4())
        
        # Create job entry in database first
        from .database_storage import create_crew_job
        job_created = create_crew_job(
            job_id=job_id,
            user_email=user_email,
            keywords=keywords,
            image_url=None
        )
        
        if not job_created:
            logger.warning(f"⚠️ Failed to create crew job entry for {job_id}, but continuing with analysis")
        
        # Start analysis in background (no image, only keywords)
        asyncio.create_task(run_analysis_background(
            job_id,
            user_email,
            None,  # No image data
            keywords
        ))
        
        # Return job ID immediately
        return JSONResponse(
            status_code=202,
            content={
                "success": True,
                "job_id": job_id,
                "message": "Keyword search scheduled successfully",
                "status": "processing"
            }
        )
    
    except Exception as e:
        print(f"❌ Error scheduling keyword search: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.get("/search/keywords/status/{job_id}")
async def get_keyword_search_status(job_id: str):
    """
    Get the status of a keyword search job.
    """
    try:
        # Check job status in database
        from .database_storage import get_crew_job_status
        
        job_status = get_crew_job_status(job_id)
        
        if not job_status:
            return JSONResponse(
                status_code=404,
                content={"error": "Job not found"}
            )
        
        return JSONResponse(
            status_code=200,
            content=job_status
        )
    
    except Exception as e:
        print(f"❌ Error getting job status: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

