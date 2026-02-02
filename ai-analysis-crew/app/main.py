"""FastAPI main application with WebSocket support for real-time updates."""

import os
from pathlib import Path

# Load local env file for development (ai-analysis-crew/.env).
# On Render/production, env vars are injected by the platform so this is a no-op.
try:
    from dotenv import load_dotenv  # type: ignore

    _env_path = Path(__file__).resolve().parents[1] / ".env"
    if _env_path.exists():
        load_dotenv(dotenv_path=_env_path, override=False)
except Exception:
    # Keep startup resilient if python-dotenv isn't available
    pass

import asyncio
import base64
import queue as queue_module
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

from pydantic import BaseModel
from fastapi import FastAPI, File, Form, UploadFile, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import json
import uvicorn
from .crew_setup import setup_crew, set_progress_emitter, emit_progress, generate_report_tool_func, send_email_tool_func
from .email_sender import send_email_via_email_service, send_basic_email_smtp, send_no_regional_suppliers_email
from .utils import ensure_temp_dir
from .vision_analyzer import get_image_description
from .database_storage import store_crew_analysis_to_database, update_crew_job_status, complete_crew_job
from openai import OpenAI

app = FastAPI(
    title="AI Spare Part Analyzer API",
    description="AI-powered manufacturer part identification, research, and supplier discovery",
    version="2.0.1",
    redirect_slashes=True  # Allow both /api/billing and /api/billing/
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register API routers
from .api.routes_auth import router as auth_router
from .api.routes_billing import router as billing_router
from .api.routes_credits import router as credits_router
from .api.routes_statistics import router as statistics_router
from .api.routes_dashboard import router as dashboard_router
from .api.routes_history import router as history_router
from .api.routes_notifications import router as notifications_router
from .api.routes_user import router as user_router
from .api.routes_upload import router as upload_router
from .api.routes_reviews import router as reviews_router
from .api.routes_search import router as search_router

app.include_router(auth_router, prefix="/api")
app.include_router(billing_router, prefix="/api")
app.include_router(credits_router, prefix="/api")
app.include_router(statistics_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(upload_router, prefix="/api")
app.include_router(reviews_router, prefix="/api")
app.include_router(search_router, prefix="/api")

print("All API routers registered successfully")
logger.info("All API routers registered successfully")

# Debug endpoint to verify routes
@app.get("/api/debug/routes")
async def debug_routes():
    """Debug endpoint to list all registered routes."""
    routes = []
    for route in app.routes:
        if hasattr(route, "path") and hasattr(route, "methods"):
            routes.append({
                "path": route.path,
                "methods": list(route.methods)
            })
    return {"total_routes": len(routes), "api_routes": [r for r in routes if r["path"].startswith("/api")]}

# Test endpoint to verify billing route works
@app.get("/api/test/billing")
async def test_billing():
    """Test endpoint to verify billing route is accessible."""
    return {"message": "Billing route test - this endpoint works", "status": "ok"}


@app.get("/api/cron/reminders")
async def cron_reminders(
    type: str = "reengagement",
    inactive_days: int = 14,
    days_after_signup: int = 1,
    limit: int = 50,
):
    """
    Public cron endpoint: run onboarding or reengagement reminder emails.
    Reengagement: sends AI-generated emails (new content each time) to users inactive for N days.
    Call daily from cron-job.org or similar.
    Query: ?type=reengagement&inactive_days=14&limit=50  or  ?type=onboarding&days_after_signup=1&limit=50
    """
    if type not in ("onboarding", "reengagement"):
        return {"ok": False, "error": "type must be 'onboarding' or 'reengagement'"}
    limit = max(1, min(limit, 200))
    inactive_days = max(1, min(inactive_days, 365))
    days_after_signup = max(0, min(days_after_signup, 30))
    try:
        from .cron_reminders import run_cron_reminders_background
        summary = await run_cron_reminders_background(
            reminder_type=type,
            days_after_signup=days_after_signup,
            inactive_days=inactive_days,
            limit=limit,
        )
        return {"ok": True, **summary}
    except Exception as e:
        logger.error(f"❌ Cron reminders failed: {e}")
        return {"ok": False, "error": str(e)}


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


async def auto_start_pending_jobs():
    """Background task to automatically start pending analysis jobs."""
    # Import here to avoid circular imports at module level
    try:
        from app.api.supabase_admin import get_supabase_admin
    except ImportError:
        # Fallback: try relative import
        try:
            from .api.supabase_admin import get_supabase_admin
        except ImportError:
            logger.error("Failed to import get_supabase_admin - auto-start disabled")
            return
    
    import httpx
    
    while True:
        try:
            await asyncio.sleep(10)  # Check every 10 seconds
            
            supabase = get_supabase_admin()
            
            # Find pending jobs
            result = (
                supabase.table("crew_analysis_jobs")
                .select("id, user_email, keywords, image_url, image_name")
                .eq("status", "pending")
                .limit(10)  # Process max 10 at a time
                .execute()
            )
            
            if not result.data or len(result.data) == 0:
                continue
            
            logger.info(f"Found {len(result.data)} pending jobs to start")
            
            for job in result.data:
                job_id = job.get("id")
                user_email = job.get("user_email")
                keywords = job.get("keywords") or ""
                image_url = job.get("image_url")
                
                if not job_id or not user_email:
                    continue
                
                try:
                    # Update status to processing immediately
                    update_crew_job_status(job_id, "processing", "starting", 5)
                    
                    # Fetch image if URL is provided and not a placeholder
                    image_data = None
                    if image_url and not image_url.startswith("placeholder_url"):
                        try:
                            async with httpx.AsyncClient(timeout=30.0) as client:
                                img_response = await client.get(image_url)
                                if img_response.status_code == 200:
                                    image_data = img_response.content
                                    logger.info(f"Fetched image for job {job_id} ({len(image_data)} bytes)")
                        except Exception as img_error:
                            logger.warning(f"Failed to fetch image for job {job_id}: {img_error}")
                            # Continue without image - analysis can still proceed with keywords
                    
                    # Start analysis in background
                    asyncio.create_task(
                        run_analysis_background(
                            job_id,
                            user_email,
                            image_data,
                            keywords
                        )
                    )
                    
                    logger.info(f"Started pending job {job_id} for {user_email}")
                    
                except Exception as job_error:
                    logger.error(f"Failed to start pending job {job_id}: {job_error}")
                    import traceback
                    logger.error(traceback.format_exc())
                    # Mark as failed
                    try:
                        update_crew_job_status(
                            job_id,
                            "failed",
                            "error",
                            0,
                            str(job_error)
                        )
                    except:
                        pass
        
        except Exception as e:
            logger.error(f"Error in auto-start pending jobs task: {e}")
            import traceback
            logger.error(traceback.format_exc())
            await asyncio.sleep(30)  # Wait longer on error


async def redis_broadcast_loop(message_queue: queue_module.Queue):
    """Read crew job updates from Redis subscriber queue and broadcast to all WebSocket clients."""
    loop = asyncio.get_event_loop()

    def get_message():
        return message_queue.get(timeout=2.0)

    while True:
        try:
            msg = await loop.run_in_executor(None, get_message)
            await manager.broadcast(msg)
        except queue_module.Empty:
            await asyncio.sleep(0.1)
        except Exception as e:
            logger.debug("Redis broadcast loop error: %s", e)
            await asyncio.sleep(1.0)


@app.on_event("startup")
async def startup_event():
    """Initialize on startup."""
    ensure_temp_dir()
    # Debug: Print all registered routes
    api_routes = [r for r in app.routes if hasattr(r, "path") and r.path.startswith("/api")]
    logger.info(f"Registered {len(api_routes)} API routes on startup")
    for route in api_routes[:10]:  # Print first 10
        logger.info(f"  {route.path} {getattr(route, 'methods', [])}")
    
    # Start background task to auto-start pending jobs
    asyncio.create_task(auto_start_pending_jobs())
    logger.info("Started auto-start pending jobs background task")

    # Redis Pub/Sub: subscribe to crew_job_updates and broadcast to WebSocket clients
    try:
        from .redis_client import is_redis_configured, start_job_updates_subscriber
        if is_redis_configured():
            redis_queue: queue_module.Queue = queue_module.Queue()
            start_job_updates_subscriber(redis_queue)
            asyncio.create_task(redis_broadcast_loop(redis_queue))
            logger.info("Started Redis Pub/Sub broadcast loop for job updates")
    except ImportError:
        pass


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


class EmailProxyRequest(BaseModel):
    to: str
    subject: str
    html: str
    text: str | None = None


class EmailCopyRequest(BaseModel):
    kind: str  # "onboarding" | "reengagement"
    brand: str | None = "SpareFinder"
    audience: str | None = "industrial maintenance & spares teams"
    language: str | None = "en"


class EmailCopyResponse(BaseModel):
    subject: str
    headline: str
    subhead: str
    bullets: list[str]
    ctaLabel: str


@app.post("/email/copy")
async def email_copy(payload: EmailCopyRequest):
    """
    Generate catchy, high-converting reminder email copy.
    Returns a small JSON payload for the backend to inject into HTML templates.
    """
    kind = (payload.kind or "").strip().lower()
    if kind not in ("onboarding", "reengagement"):
        raise HTTPException(status_code=400, detail="kind must be 'onboarding' or 'reengagement'")

    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise HTTPException(status_code=501, detail="OPENAI_API_KEY not configured")

    brand = payload.brand or "SpareFinder"
    audience = payload.audience or "industrial maintenance & spares teams"
    language = payload.language or "en"

    now = datetime.utcnow().isoformat()

    system = (
        f"You are a senior lifecycle marketer for {brand}. "
        f"Write concise, high-converting email copy for {audience}. "
        "Avoid spammy words (FREE!!!, guarantee, act now). "
        "Keep it friendly, confident, and practical. "
        "Return ONLY valid JSON matching the schema."
    )

    user = {
        "task": "Generate reminder email copy",
        "kind": kind,
        "constraints": {
            "subject_max_chars": 60,
            "headline_max_chars": 70,
            "subhead_max_chars": 140,
            "bullets_count": 3,
            "bullet_max_chars_each": 90,
            "cta_max_chars": 28,
            "language": language,
        },
        "notes": [
            "Use {{userName}} placeholder in headline if it fits naturally; otherwise don't.",
            "Make it feel fresh/unique each run.",
            f"Timestamp seed: {now}",
        ],
        "schema": {
            "subject": "string",
            "headline": "string",
            "subhead": "string",
            "bullets": ["string", "string", "string"],
            "ctaLabel": "string",
        },
    }

    try:
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model=os.getenv("EMAIL_COPY_MODEL", "gpt-4o-mini"),
            temperature=0.9,
            max_tokens=300,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": json.dumps(user)},
            ],
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content or "{}"
        data = json.loads(content)

        # Validate/normalize
        parsed = EmailCopyResponse(
            subject=str(data.get("subject", "")).strip(),
            headline=str(data.get("headline", "")).strip(),
            subhead=str(data.get("subhead", "")).strip(),
            bullets=[str(x).strip() for x in (data.get("bullets") or [])][:3],
            ctaLabel=str(data.get("ctaLabel", "")).strip(),
        )
        if len(parsed.bullets) < 3:
            parsed.bullets = (parsed.bullets + [""] * 3)[:3]

        # Basic fallbacks
        if not parsed.subject:
            parsed.subject = "Quick check-in from SpareFinder"
        if not parsed.headline:
            parsed.headline = "{{userName}}, ready for your next part?"
        if not parsed.subhead:
            parsed.subhead = "Upload a photo and get a confident match in seconds."
        if not parsed.ctaLabel:
            parsed.ctaLabel = "Upload a part photo"

        return parsed.model_dump()
    except Exception as e:
        logger.error(f"❌ Failed to generate email copy: {e}")
        raise HTTPException(status_code=502, detail="Failed to generate email copy")


@app.post("/email/send")
async def email_send(payload: EmailProxyRequest):
    """
    Proxy endpoint to send emails through the separate email-service.
    Configure EMAIL_SERVICE_URL on this service (Render env var).
    """
    # Prefer direct SMTP when configured (Hostinger/custom).
    # Only fall back to the external email-service when SMTP isn't configured.
    has_smtp_creds = bool(
        (os.getenv("SMTP_USER") or os.getenv("GMAIL_USER") or "").strip()
        and (
            os.getenv("SMTP_PASSWORD")
            or os.getenv("SMTP_PASS")
            or os.getenv("GMAIL_PASS")
            or ""
        ).strip()
    )

    ok = False
    if has_smtp_creds:
        ok = send_basic_email_smtp(
            to_email=payload.to,
            subject=payload.subject,
            html=payload.html,
            text=payload.text,
        )

    if not ok:
        ok = send_email_via_email_service(
            to_email=payload.to,
            subject=payload.subject,
            html=payload.html,
            text=payload.text,
        )
    if not ok:
        raise HTTPException(status_code=502, detail="Email sending failed")
    return {"success": True}


class TestReengagementEmailRequest(BaseModel):
    email: str
    user_name: str | None = None


@app.post("/test/reengagement-email")
async def test_reengagement_email(payload: TestReengagementEmailRequest):
    """
    Test endpoint to send a reengagement email with AI-generated image.
    Useful for testing the email generation and image creation.
    """
    try:
        from .cron_reminders import _send_reengagement_email
        
        user_name = payload.user_name or (payload.email.split("@")[0] if "@" in payload.email else "there")
        
        success = _send_reengagement_email(
            to_email=payload.email,
            user_name=user_name
        )
        
        if success:
            return {
                "success": True,
                "message": f"Reengagement email sent successfully to {payload.email}",
                "user_name": user_name
            }
        else:
            raise HTTPException(
                status_code=502,
                detail="Failed to send reengagement email"
            )
    except Exception as e:
        logger.error(f"❌ Failed to send test reengagement email: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error sending test email: {str(e)}"
        )


@app.get("/unsubscribe")
async def unsubscribe_email(token: str, reason: str | None = None):
    """
    Unsubscribe endpoint for marketing emails.
    Users can click the unsubscribe link in emails to opt out.
    """
    try:
        from .unsubscribe_utils import unsubscribe_user
        
        result = unsubscribe_user(token=token, reason=reason, source="email_link")
        
        if result.get("success"):
            # Return HTML page confirming unsubscribe
            html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsubscribed - SpareFinder</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #f8fafc;
            margin: 0;
            padding: 40px 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }}
        .container {{
            background: white;
            border-radius: 12px;
            padding: 40px;
            max-width: 500px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
        }}
        h1 {{
            color: #0f172a;
            margin-bottom: 16px;
        }}
        p {{
            color: #64748b;
            line-height: 1.6;
            margin-bottom: 24px;
        }}
        .success-icon {{
            font-size: 48px;
            margin-bottom: 16px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✓</div>
        <h1>You've been unsubscribed</h1>
        <p>You have successfully been unsubscribed from SpareFinder marketing emails.</p>
        <p>You will no longer receive reengagement or promotional emails from us.</p>
        <p style="font-size: 14px; margin-top: 32px;">
            <a href="https://sparefinder.org" style="color: #2563eb; text-decoration: none;">Return to SpareFinder</a>
        </p>
    </div>
</body>
</html>
"""
            from fastapi.responses import HTMLResponse
            return HTMLResponse(content=html_content)
        else:
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "Invalid unsubscribe token")
            )
    except Exception as e:
        logger.error(f"❌ Failed to process unsubscribe: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing unsubscribe: {str(e)}"
        )


async def run_analysis_background(
    analysis_id: str,
    user_email: str,
    image_data: Optional[bytes],
    keywords: Optional[str],
    user_country: Optional[str] = None,
    user_region: Optional[str] = None,
):
    """Run the SpareFinder Research in the background and update database."""
    try:
        # Update status to processing - Image Analysis stage
        update_crew_job_status(analysis_id, "processing", "image_analysis", 10)
        
        # Pre-analyze image with GPT-4o Vision if image is provided
        if image_data:
            detailed_description = get_image_description(image_data, keywords)
            update_crew_job_status(analysis_id, "processing", "part_identifier", 20)
            crew, report_task = setup_crew(
                None, detailed_description, user_email,
                user_country=user_country, user_region=user_region,
            )
        else:
            update_crew_job_status(analysis_id, "processing", "part_identifier", 15)
            crew, report_task = setup_crew(
                None, keywords, user_email,
                user_country=user_country, user_region=user_region,
            )
        
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
        
        # Detect no-regional-suppliers so we can flag job and email user
        no_regional_suppliers = (
            "[NO_REGIONAL_SUPPLIERS]" in result_text
            and (user_country or user_region)
        )
        region_label = ", ".join(x for x in (user_country, user_region) if x) if (user_country or user_region) else ""
        if no_regional_suppliers:
            result_text = result_text.replace("[NO_REGIONAL_SUPPLIERS]", "").strip()
            logger.info(f"📌 No regional suppliers for {region_label}; will flag job and send follow-up email")
        
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
        
        # Send email (non-blocking - don't fail analysis if email fails)
        logger.info(f"📧 Attempting to send email to {user_email}")
        try:
            email_result = send_email_tool_func(user_email, pdf_path, pdf_public_url)
            if "successfully" in email_result.lower():
                logger.info(f"✅ Email sent successfully to {user_email}")
            else:
                logger.warning(f"⚠️ Email sending failed, but analysis will continue: {email_result}")
        except Exception as email_error:
            logger.error(f"❌ Error during email sending: {email_error}")
            logger.warning("⚠️ Email sending failed, but analysis completed successfully")
            # Don't re-raise - continue with job completion
        
        # Complete the job - use public URL if available, otherwise filename
        logger.info(f"🏁 Completing job {analysis_id}")
        # Set status to completed first so UI updates even if full completion payload fails
        update_crew_job_status(analysis_id, "completed", "completed", 100)
        pdf_url_for_completion = pdf_public_url if pdf_public_url else pdf_filename
        result_data = {'report_text': result_text}
        if no_regional_suppliers:
            result_data['no_regional_suppliers'] = True
        completion_success = complete_crew_job(
            job_id=analysis_id,
            result_data=result_data,
            pdf_url=pdf_url_for_completion
        )
        
        if completion_success:
            logger.info(f"✅ Job {analysis_id} marked as completed in database")
        else:
            logger.warning(f"⚠️ Full job completion update failed; status was already set to completed")
        
        # If no suppliers were found in user region, send follow-up email (retry / disable preference)
        if no_regional_suppliers and region_label:
            try:
                send_ok = send_no_regional_suppliers_email(
                    to_email=user_email,
                    region_label=region_label,
                )
                if send_ok:
                    logger.info(f"✅ No-regional-suppliers email sent to {user_email}")
                else:
                    logger.warning("⚠️ No-regional-suppliers email could not be sent")
            except Exception as email_err:
                logger.warning(f"⚠️ No-regional-suppliers email failed: {email_err}")
        
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
        
        # Send email (non-blocking - don't fail analysis if email fails)
        try:
            email_result = send_email_tool_func(user_email, pdf_path, pdf_public_url)
            if "successfully" in email_result.lower():
                emit_progress("completion", "✅ Analysis complete! Report sent to your email.", "completed")
            else:
                emit_progress("completion", "✅ Analysis complete! (Email sending failed, but report is available)", "completed")
                logger.warning(f"⚠️ Email sending failed: {email_result}")
        except Exception as email_error:
            logger.error(f"❌ Error during email sending: {email_error}")
            emit_progress("completion", "✅ Analysis complete! (Email sending failed, but report is available)", "completed")
            # Don't re-raise - continue with completion
        
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


# Search routes moved to routes_search.py router
# These endpoints are now available at:
# - POST /api/search/keywords
# - POST /api/search/keywords/schedule (legacy)
# - GET /api/search/keywords/status/{job_id}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

