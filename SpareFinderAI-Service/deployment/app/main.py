import os
import uuid
import logging
import json
import asyncio
import sys
import signal
from typing import Dict, Any, Optional, List
import smtplib
from email.message import EmailMessage
import ssl
import base64
import io
import time
import requests

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
from openai import OpenAI

from dotenv import load_dotenv

from .services.ai_service import analyze_part_image
from .services.email_templates import (
    analysis_started_subject,
    analysis_started_html,
    analysis_completed_subject,
    analysis_completed_html,
    analysis_failed_subject,
    analysis_failed_html,
    keyword_started_subject,
    keyword_started_html,
    keyword_completed_subject,
    keyword_completed_html,
)
from .services.scraper import scrape_supplier_page
from .services.enhanced_scraper import scrape_supplier_page as enhanced_scrape_supplier_page, scrape_multiple_suppliers
from .services.job_store import load_job_snapshot, save_job_snapshot
from .core.config import settings
from supabase import create_client

class KeywordSearchRequest(BaseModel):
    keywords: Optional[List[str]] = None

class KeywordScheduleRequest(BaseModel):
    keywords: Optional[List[str]] = None
    user_email: Optional[str] = None

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

# Email utilities
def _email_is_enabled() -> bool:
    """Check if email notifications are enabled by fetching SMTP config from backend API.
    
    Falls back to environment variable check if backend is unavailable.
    """
    try:
        # Try to get SMTP config from backend API first
        smtp_config = _get_smtp_config()
        if smtp_config:
            return True
    except Exception:
        pass
    
    # Fallback to environment variable check
    return bool(os.getenv('SMTP_HOST'))

def _build_analysis_email_html(result: Dict[str, Any]) -> str:
    part_name = result.get("precise_part_name") or result.get("class_name") or "Identified Part"
    confidence = result.get("confidence_score", 0)
    description = result.get("description") or "Analysis summary attached."
    price = result.get("estimated_price") or {}
    suppliers = result.get("suppliers") or []
    processing_time = result.get("processing_time_seconds") or 0
    filename = result.get("filename") or ""

    # Build deep links
    frontend_base = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
    analysis_path = os.getenv("FRONTEND_ANALYSIS_PATH", "/upload")
    view_url = f"{frontend_base}{analysis_path}?job={filename}" if filename else frontend_base
    api_base = os.getenv("AI_SERVICE_PUBLIC_URL", "http://localhost:8000").rstrip("/")
    status_url = f"{api_base}/analyze-part/status/{filename}" if filename else api_base

    def esc(s: Any) -> str:
        try:
            return str(s)
        except Exception:
            return ""

    supplier_rows = "".join([
        f"<tr><td style='padding:8px;border-top:1px solid #223047'>{esc(s.get('name',''))}</td><td style='padding:8px;border-top:1px solid #223047'><a style='color:#60a5fa' href='{esc(s.get('url',''))}' target='_blank'>Link</a></td><td style='padding:8px;border-top:1px solid #223047'>{esc(s.get('price_range',''))}</td><td style='padding:8px;border-top:1px solid #223047'>{esc(s.get('shipping_region',''))}</td></tr>"
        for s in suppliers[:5]
    ])

    # Charts
    try:
        confidence_val = float(confidence)
    except Exception:
        confidence_val = 0.0
    confidence_img = _render_confidence_chart_png(confidence_val)
    price_img = _render_price_chart_png(price)

    return f"""
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0b1026;color:#e2e8f0;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#0b1026,#1a1033,#0c1226);padding:32px 0;">
    <tr>
      <td>
        <table role="presentation" width="640" align="center" cellspacing="0" cellpadding="0" style="background:#0f172a;border-radius:14px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35);">
          <tr>
            <td style="padding:22px 28px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;">
              <h1 style="margin:0;font-size:20px;">Part analysis completed</h1>
              <p style="margin:6px 0 0 0;opacity:.9;">SpareFinder AI</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <h2 style="margin:0 0 6px 0;color:#e2e8f0;font-size:18px;">{esc(part_name)}</h2>
              <p style="margin:0 0 10px 0;color:#94a3b8;">Confidence: {esc(confidence)}%</p>
              <div style="margin:8px 0 18px 0;">
                <img alt="Confidence" src="{confidence_img}" style="display:block;border-radius:8px;max-width:100%;" />
              </div>
              <p style="margin:0 0 14px 0;color:#cbd5e1;">{esc(description)}</p>

              <div style="margin:16px 0 8px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px;background:#0b1324;border-radius:8px;">
                      <div style="color:#cbd5e1;font-size:14px;">
                        <strong style="color:#e2e8f0;">Estimated price</strong>
                        <div>New: {esc(price.get('new',''))}</div>
                        <div>Used: {esc(price.get('used',''))}</div>
                        <div>Refurbished: {esc(price.get('refurbished',''))}</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
              <div style="margin:8px 0 18px 0;">
                <img alt="Price comparison" src="{price_img}" style="display:block;border-radius:8px;max-width:100%;" />
              </div>

              <div style="margin:18px 0 0 0;">
                <a href="{view_url}"
                   style="display:inline-block;background:#22c55e;color:#0b1026;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:600">
                  View analysis in SpareFinder
                </a>
                <div style="margin-top:8px;color:#64748b;font-size:12px;">
                  If the button doesn't work, open: <a href="{status_url}" style="color:#60a5fa;">status link</a>
                </div>
              </div>

              {('<h3 style="margin:18px 0 8px 0;color:#e2e8f0;font-size:16px;">Suppliers</h3>' if suppliers else '')}
              {('<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#0b1324;border-radius:10px;">' if suppliers else '')}
              {('<tr><th align="left" style="padding:10px;color:#94a3b8;">Name</th><th align="left" style="padding:10px;color:#94a3b8;">Link</th><th align="left" style="padding:10px;color:#94a3b8;">Price</th><th align="left" style="padding:10px;color:#94a3b8;">Region</th></tr>' if suppliers else '')}
              {supplier_rows}
              {('</table>' if suppliers else '')}

              <p style="margin:16px 0 0;color:#64748b;font-size:12px;">Processed in ~{esc(processing_time)}s</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

def _get_smtp_config() -> Optional[Dict[str, Any]]:
    """Fetch SMTP configuration from backend API"""
    try:
        backend_url = os.getenv('BACKEND_URL', 'http://localhost:4000')
        api_key = os.getenv('AI_SERVICE_API_KEY', '')
        
        if not api_key:
            logger.warning("AI_SERVICE_API_KEY not configured, falling back to environment variables")
            return None
            
        headers = {
            'x-api-key': api_key,
            'Content-Type': 'application/json'
        }
        
        response = requests.get(f'{backend_url}/api/admin/ai/smtp-config', headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('enabled'):
                logger.info("Using database-configured SMTP settings")
                return data.get('config')
            else:
                logger.warning(f"SMTP not enabled or configured: {data.get('message', 'Unknown error')}")
                return None
        else:
            logger.warning(f"Failed to fetch SMTP config from backend: {response.status_code}")
            return None
            
    except Exception as e:
        logger.warning(f"Error fetching SMTP config from backend: {e}")
        return None

def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    try:
        # Try to get SMTP config from backend API first
        smtp_config = _get_smtp_config()
        
        if smtp_config:
            # Use database-configured SMTP settings
            host = smtp_config.get('host', '')
            port = smtp_config.get('port', 587)
            user = smtp_config.get('user', '')
            password = smtp_config.get('password', '')
            sender_name = smtp_config.get('from_name', 'SpareFinder')
            sender_email = smtp_config.get('from_email', user)
            secure = smtp_config.get('secure', False)
        else:
            # Fallback to environment variables
            host = os.getenv('SMTP_HOST', '')
            port = int(os.getenv('SMTP_PORT', '587'))
            user = os.getenv('SMTP_USER', '')
            password = os.getenv('SMTP_PASS') or os.getenv('SMTP_PASSWORD', '')
            sender_name = 'SpareFinder'
            sender_email = os.getenv('SMTP_FROM', user or 'noreply.tpsinternational@gmail.com')
            secure = os.getenv('SMTP_SECURE', 'starttls').lower() == 'ssl'

        if not host or not sender_email:
            logger.warning("SMTP configuration incomplete")
            return False

        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = f'"{sender_name}" <{sender_email}>'
        msg['To'] = to_email
        msg.set_content('Your SpareFinder AI analysis is complete.')
        msg.add_alternative(html_body, subtype='html')

        if secure:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context) as server:
                if user and password:
                    server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                if user and password:
                    server.login(user, password)
                server.send_message(msg)
        return True
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return False

def _send_analysis_email(to_email: str, result: Dict[str, Any]) -> None:
    try:
        if not _email_is_enabled():
            return
        subject = f"SpareFinder AI – Analysis completed: {result.get('precise_part_name') or result.get('class_name') or 'Part'}"
        html = _build_analysis_email_html(result)
        ok = _send_email(to_email, subject, html)
        if ok:
            logger.info(f"Analysis email sent to {to_email}")
        else:
            logger.warning(f"Analysis email not sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send analysis email: {e}")

def _parse_price_range(value: Optional[str]) -> Optional[tuple]:
    try:
        if not value:
            return None
        import re
        nums = re.findall(r"[-+]?[0-9]*\.?[0-9]+", value.replace(",", ""))
        vals = [float(n) for n in nums]
        if len(vals) >= 2:
            low, high = vals[0], vals[1]
            if high < low:
                low, high = high, low
            return (low, high)
        if len(vals) == 1:
            return (vals[0], vals[0])
        return None
    except Exception:
        return None

def _png_data_uri(img) -> str:
    import PIL.Image
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    b64 = base64.b64encode(buf.getvalue()).decode('ascii')
    return f"data:image/png;base64,{b64}"

def _render_confidence_chart_png(confidence: float) -> str:
    try:
        from PIL import Image, ImageDraw, ImageFont
        width, height = 480, 48
        confidence = max(0.0, min(100.0, float(confidence)))
        bar_w = int((confidence / 100.0) * (width - 20))
        img = Image.new('RGB', (width, height), (11, 16, 38))
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle((10, height//2 - 10, width - 10, height//2 + 10), radius=10, fill=(34, 48, 71))
        draw.rounded_rectangle((10, height//2 - 10, 10 + bar_w, height//2 + 10), radius=10, fill=(59, 130, 246))
        label = f"Confidence: {int(round(confidence))}%"
        try:
            font = ImageFont.truetype("arial.ttf", 14)
        except Exception:
            font = ImageFont.load_default()
        tw, th = draw.textsize(label, font=font)
        draw.text(((width - tw)//2, (height - th)//2), label, fill=(226, 232, 240), font=font)
        return _png_data_uri(img)
    except Exception as e:
        logger.warning(f"Confidence chart render failed: {e}")
        from PIL import Image
        return _png_data_uri(Image.new('RGB', (1, 1), (0, 0, 0)))

def _render_price_chart_png(price: Dict[str, Any]) -> str:
    try:
        from PIL import Image, ImageDraw, ImageFont
        width, height = 480, 160
        padding = 12
        img = Image.new('RGB', (width, height), (11, 16, 38))
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("arial.ttf", 13)
            font_bold = ImageFont.truetype("arial.ttf", 14)
        except Exception:
            font = ImageFont.load_default()
            font_bold = font

        items = [
            ("New", _parse_price_range((price or {}).get('new'))),
            ("Used", _parse_price_range((price or {}).get('used'))),
            ("Refurb", _parse_price_range((price or {}).get('refurbished'))),
        ]
        highs = [rng[1] for _, rng in items if rng]
        max_high = max(highs) if highs else 0
        if max_high <= 0:
            from PIL import Image
            return _png_data_uri(Image.new('RGB', (1, 1), (0, 0, 0)))

        bar_area_w = width - padding * 2 - 80
        y = padding + 8
        for label, rng in items:
            draw.text((padding, y), label, fill=(148, 163, 184), font=font_bold)
            y_bar_top = y + 18
            y_bar_bottom = y_bar_top + 18
            draw.rounded_rectangle((padding + 64, y_bar_top, padding + 64 + bar_area_w, y_bar_bottom), radius=8, fill=(34, 48, 71))
            if rng:
                low, high = rng
                low = max(0.0, low)
                high = max(low, high)
                x0 = padding + 64 + int((low / max_high) * bar_area_w)
                x1 = padding + 64 + int((high / max_high) * bar_area_w)
                draw.rounded_rectangle((x0, y_bar_top, x1, y_bar_bottom), radius=8, fill=(16, 185, 129))
                val_text = f"${int(low)}–${int(high)}"
                tw, th = draw.textsize(val_text, font=font)
                tx = min(x1 + 6, width - tw - padding)
                draw.text((tx, y_bar_top - 1), val_text, fill=(226, 232, 240), font=font)
            y += 44

        title = "Price ranges (scaled)"
        tw, th = draw.textsize(title, font=font_bold)
        draw.text(((width - tw)//2, 4), title, fill=(226, 232, 240), font=font_bold)

        return _png_data_uri(img)
    except Exception as e:
        logger.warning(f"Price chart render failed: {e}")
        from PIL import Image
        return _png_data_uri(Image.new('RGB', (1, 1), (0, 0, 0)))


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
    model_config = {"protected_namespaces": ()}
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

        # Ensure OpenAI API key is configured
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            logger.error("OPENAI_API_KEY not configured")
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "ai_not_configured",
                    "message": "OPENAI_API_KEY is not set on the AI service"
                }
            )

        # Build prompt to request structured JSON results
        system_prompt = (
            "You are an expert automotive parts search assistant. Given a list of keywords, "
            "return a JSON object containing: (1) an array named 'results' of relevant parts where each result has: "
            "name, category, manufacturer (optional), part_number (optional), price (string, optional), availability (optional); "
            "and (2) a 'markdown' string. The 'markdown' must be formatted as follows: \n\n"
            "- For the FIRST (most relevant) part: expand with the following 8 sections using markdown headings and lists: \n"
            "  1. 🛞 Part Identification\n  2. 📘 Technical Description\n  3. 📊 Technical Data Sheet (as a markdown table)\n  4. 🚗 Compatible Vehicles\n  5. 💰 Pricing & Availability\n  6. 🌍 Where to Buy\n  7. 📈 Confidence Score\n  8. 📤 Additional Instructions\n"
            "- For REMAINING parts: provide a compact bullet list with: Name — Category — Manufacturer (if known).\n"
            "Do NOT include prose outside of the JSON. Respond ONLY with valid JSON containing 'results' and 'markdown'."
        )

        user_prompt = (
            "Keywords: " + ", ".join(normalized) + "\n\n" +
            "Return strictly this JSON schema: {\n  \"results\": [\n    { \"name\": string, \"category\": string, \"manufacturer\": string?, \"part_number\": string?, \"price\": string?, \"availability\": string? }\n  ],\n  \"markdown\": string\n}"
        )

        client = OpenAI(api_key=api_key)

        def call_openai() -> Dict[str, Any]:
            resp = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,
                max_tokens=600
            )
            content = resp.choices[0].message.content or "{}"
            # Attempt to parse JSON; fallback: extract JSON block
            try:
                return json.loads(content)
            except Exception:
                import re
                match = re.search(r"\{[\s\S]*\}", content)
                if match:
                    try:
                        return json.loads(match.group(0))
                    except Exception:
                        return {"results": []}
                return {"results": []}

        # Run blocking OpenAI call in a thread with timeout
        try:
            ai_result = await asyncio.wait_for(asyncio.to_thread(call_openai), timeout=15.0)
        except asyncio.TimeoutError:
            logger.warning("Keyword AI search timed out")
            return JSONResponse(
                status_code=504,
                content={
                    "success": False,
                    "error": "timeout",
                    "message": "Keyword AI search timed out"
                }
            )

        results = ai_result.get("results", [])
        if not isinstance(results, list):
            results = []
        markdown = ai_result.get("markdown", "")

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "results": results,
                "total": len(results),
                "query": {"keywords": normalized},
                "model_version": "Keyword AI v1.0",
                "markdown": markdown
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

# -----------------------------
# Background job helpers
# -----------------------------
async def _enrich_suppliers(response_data: Dict[str, Any]) -> None:
    try:
        supplier_urls: List[str] = []

        def _normalize_url(raw: Any) -> Optional[str]:
            try:
                if not isinstance(raw, str):
                    return None
                u = raw.strip()
                # Strip markdown/link punctuation
                if u.startswith('(') and u.endswith(')'):
                    u = u[1:-1].strip()
                # Remove trailing punctuation common in prose/markdown
                while u and u[-1] in ")],.>;":
                    u = u[:-1]
                if not u:
                    return None
                # If already absolute
                if u.startswith("http://") or u.startswith("https://"):
                    return u
                # Add scheme if it looks like a bare domain or www.* or path-like
                if u.startswith("www.") or "." in u:
                    return f"https://{u}"
                return None
            except Exception:
                return None
        
        # Extract URLs from suppliers array, supporting multiple common keys and bare domains
        url_keys = [
            "url",
            "product_page_url",
            "product_url",
            "website",
            "link",
            "product_page",
        ]
        for s in (response_data.get("suppliers") or [])[:10]:
            if not isinstance(s, dict):
                continue
            # Prefer explicit url, else try alternates
            found: Optional[str] = None
            for k in url_keys:
                val = s.get(k)
                found = _normalize_url(val) or found
                if found:
                    break
            if found:
                supplier_urls.append(found)
        
        # Extract URLs from buy_links (accept bare domains too)
        for _, u in (response_data.get("buy_links") or {}).items():
            nu = _normalize_url(u)
            if nu:
                supplier_urls.append(nu)

        # As a fallback, try to extract from full_analysis markdown lines like 'product_page_url: example.com/...'
        try:
            full_md = response_data.get("full_analysis") or ""
            if isinstance(full_md, str) and full_md:
                import re
                # 1) product_page_url: <url or [label](url)>
                for m in re.findall(r"product_page_url\s*:\s*(?:\[[^\]]+\]\(([^)]+)\)|([^\s\)]+))", full_md, flags=re.IGNORECASE):
                    cand = m[0] or m[1]
                    nu = _normalize_url(cand)
                    if nu:
                        supplier_urls.append(nu)
                # 2) Any markdown links in Where to Buy section
                wb = re.search(r"Where\s+to\s+Buy[\s\S]*?(?=\n#|$)", full_md, flags=re.IGNORECASE)
                if wb:
                    block = wb.group(0)
                    # Markdown links [text](url)
                    for m in re.findall(r"\]\(([^)]+)\)", block):
                        nu = _normalize_url(m)
                        if nu:
                            supplier_urls.append(nu)
                    # Bare urls/domains after colon
                    for m in re.findall(r"(?:https?://|www\.)[^\s)]+", block, flags=re.IGNORECASE):
                        nu = _normalize_url(m)
                        if nu:
                            supplier_urls.append(nu)
                    # Citations: domain.com
                    for m in re.findall(r"citations?\s*:\s*([^\s\)]+)", block, flags=re.IGNORECASE):
                        nu = _normalize_url(m)
                        if nu:
                            supplier_urls.append(nu)
        except Exception:
            pass
        
        # Remove duplicates and limit to 5 URLs
        supplier_urls = list(dict.fromkeys(supplier_urls))[:5]
        
        if not supplier_urls:
            logger.info("No supplier URLs found for enrichment")
            return

        logger.info(f"Enriching {len(supplier_urls)} supplier URLs: {supplier_urls}")
        
        # Use enhanced scraper for better contact extraction
        enriched_results = await scrape_multiple_suppliers(supplier_urls)
        
        # Update the suppliers array with enriched contact information
        if enriched_results:
            enriched_suppliers = []
            for i, supplier in enumerate(response_data.get("suppliers", [])):
                if i < len(enriched_results):
                    enriched_supplier = supplier.copy() if isinstance(supplier, dict) else {}
                    enriched_data = enriched_results[i]
                    
                    # Add enriched contact information
                    if enriched_data.get("success"):
                        enriched_supplier.update({
                            "contact_info": enriched_data.get("contact", {}),
                            "company_name": enriched_data.get("company_name"),
                            "description": enriched_data.get("description"),
                            "price_info": enriched_data.get("price_info"),
                            "business_hours": enriched_data.get("contact", {}).get("business_hours"),
                            "social_media": enriched_data.get("contact", {}).get("social_media", {}),
                            "contact_links": enriched_data.get("contact", {}).get("contact_links", []),
                            "scraped_emails": enriched_data.get("contact", {}).get("emails", []),
                            "scraped_phones": enriched_data.get("contact", {}).get("phones", []),
                            "scraped_addresses": enriched_data.get("contact", {}).get("addresses", []),
                            "scraping_success": True
                        })
                    else:
                        enriched_supplier.update({
                            "scraping_success": False,
                            "scraping_error": enriched_data.get("error", "Unknown error")
                        })
                    
                    enriched_suppliers.append(enriched_supplier)
                else:
                    enriched_suppliers.append(supplier)
            
            response_data["suppliers"] = enriched_suppliers
            response_data["supplier_enrichment"] = enriched_results
            
            logger.info(f"Successfully enriched {len(enriched_suppliers)} suppliers with contact information")
        
    except Exception as e:
        logger.error(f"Supplier enrichment failed: {e}")
        # Don't fail the entire analysis if supplier enrichment fails


async def _run_analysis_job(
    filename: str,
    file_path: str,
    keyword_list: List[str],
    confidence_threshold: float,
    max_predictions: int,
    user_email: Optional[str]
) -> None:
    try:
        # Mark as processing
        analysis_results[filename] = {
            "success": False,
            "status": "processing",
            "filename": filename
        }
        save_job_snapshot(filename, analysis_results[filename])

        # Notify start
        if user_email and _email_is_enabled():
            try:
                subj = analysis_started_subject(filename)
                body = analysis_started_html(filename, keyword_list)
                await asyncio.to_thread(_send_email, user_email, subj, body)
            except Exception:
                pass

        # Perform analysis (no external await timeout here; handled by upstream timeouts inside service)
        analysis_result = await analyze_part_image(
            file_path,
            keywords=keyword_list,
            confidence_threshold=confidence_threshold,
            max_predictions=max_predictions
        )

        if not analysis_result.get("success"):
            analysis_result["filename"] = filename
            analysis_results[filename] = analysis_result
            save_job_snapshot(filename, analysis_result)
            return

        response_data = {"filename": filename, **analysis_result}

        # Update status for UI and persist snapshot before supplier enrichment
        try:
            analysis_results[filename] = {
                **response_data,
                "status": "Retrieving Supplier Info",
            }
            save_job_snapshot(filename, analysis_results[filename])
        except Exception:
            pass

        # Supplier enrichment
        await _enrich_suppliers(response_data)

        # Send completion email if requested
        if user_email:
            try:
                # Modern template
                subject = analysis_completed_subject(response_data)
                html = analysis_completed_html(response_data)
                await asyncio.to_thread(_send_email, user_email, subject, html)
            except Exception as e:
                logger.error(f"Email send failed (job): {e}")

        # Mark as completed and persist enriched result
        response_data["status"] = "completed"
        response_data["success"] = True
        analysis_results[filename] = response_data
        save_job_snapshot(filename, response_data)

        # Update database record with completed details if Supabase is configured
        try:
            supabase_url = os.getenv("SUPABASE_URL", "").strip()
            service_key = (
                os.getenv("SUPABASE_SERVICE_KEY")
                or os.getenv("SUPABASE_ANON_KEY", "")
            ).strip()
            if supabase_url and service_key:
                client = create_client(supabase_url, service_key)
                primary = None
                preds = response_data.get("predictions") or []
                if isinstance(preds, list) and preds:
                    primary = preds[0]
                client.from_("part_searches").upsert(
                    {
                        "id": filename,
                        "part_name": (primary or {}).get("class_name") or response_data.get("precise_part_name"),
                        "manufacturer": (primary or {}).get("manufacturer"),
                        "category": (primary or {}).get("category"),
                        "part_number": (primary or {}).get("part_number"),
                        "predictions": preds,
                        "confidence_score": response_data.get("confidence") or response_data.get("confidence_score"),
                        "processing_time": response_data.get("processing_time") or response_data.get("processing_time_seconds"),
                        "processing_time_ms": response_data.get("processing_time") or response_data.get("processing_time_seconds"),
                        "model_version": response_data.get("model_version"),
                        "analysis_status": "completed" if response_data.get("success") else "failed",
                        "metadata": {"analysis": response_data},
                    },
                    on_conflict="id",
                ).execute()
        except Exception as e:
            logger.warning(f"DB upsert failed for {filename}: {e}")
        logger.info(f"Analysis job completed for {filename}")
    except Exception as e:
        logger.error(f"Analysis job error for {filename}: {e}")
        analysis_results[filename] = {
            "success": False,
            "status": "failed",
            "error": str(e),
            "filename": filename
        }
        save_job_snapshot(filename, analysis_results[filename])
        # Mark failed in DB if possible
        try:
            supabase_url = os.getenv("SUPABASE_URL", "").strip()
            service_key = (
                os.getenv("SUPABASE_SERVICE_KEY")
                or os.getenv("SUPABASE_ANON_KEY", "")
            ).strip()
            if supabase_url and service_key:
                client = create_client(supabase_url, service_key)
                client.from_("part_searches").upsert(
                    {
                        "id": filename,
                        "analysis_status": "failed",
                        "error_message": str(e),
                    },
                    on_conflict="id",
                ).execute()
        except Exception:
            pass
        # Failure email
        if user_email and _email_is_enabled():
            try:
                subj = analysis_failed_subject(filename)
                body = analysis_failed_html(filename, str(e))
                await asyncio.to_thread(_send_email, user_email, subj, body)
            except Exception:
                pass

async def _run_keyword_search_job(job_id: str, keyword_list: List[str], user_email: Optional[str]) -> None:
    try:
        # Mark as processing
        analysis_results[job_id] = {
            "success": False,
            "status": "processing",
            "filename": job_id,
            "mode": "keywords_only",
        }
        save_job_snapshot(job_id, analysis_results[job_id])

        # Email start
        logger.info(f"🔍 Email check for job {job_id}: user_email={user_email}, _email_is_enabled()={_email_is_enabled()}")
        if user_email and _email_is_enabled():
            logger.info(f"📧 Sending keyword started email to {user_email}")
            try:
                await asyncio.to_thread(
                    _send_email,
                    user_email,
                    keyword_started_subject(keyword_list or []),
                    keyword_started_html(keyword_list or []),
                )
                logger.info(f"✅ Keyword started email sent successfully to {user_email}")
            except Exception as e:
                logger.error(f"❌ Failed to send keyword started email: {e}")
        else:
            logger.warning(f"⚠️ Email not sent: user_email={user_email}, email_enabled={_email_is_enabled()}")

        # Reuse the inline logic from the /search/keywords endpoint
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set")

        normalized = [str(k).strip().lower() for k in (keyword_list or []) if str(k).strip()]

        system_prompt = (
            "You are SpareFinder AI. Given automotive keywords, return a concise JSON with 'results'[] and optional 'markdown' string."
        )
        user_prompt = (
            f"Find automotive parts related to: {', '.join(normalized)}. Return fields: name, category, manufacturer, price, availability, part_number."
        )

        from openai import OpenAI as _OpenAI
        client = _OpenAI(api_key=api_key)

        def _call_openai() -> Dict[str, Any]:
            resp = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_tokens=600,
            )
            content = resp.choices[0].message.content or "{}"
            try:
                return json.loads(content)
            except Exception:
                import re
                match = re.search(r"\{[\s\S]*\}", content)
                if match:
                    try:
                        return json.loads(match.group(0))
                    except Exception:
                        return {"results": []}
                return {"results": []}

        ai_result = await asyncio.wait_for(asyncio.to_thread(_call_openai), timeout=20.0)
        results = ai_result.get("results", [])
        if not isinstance(results, list):
            results = []
        markdown = ai_result.get("markdown", "")

        response_data = {
            "success": True,
            "status": "completed",
            "filename": job_id,
            "mode": "keywords_only",
            "results": results,
            "markdown": markdown,
            "query": {"keywords": normalized},
        }

        # Optional email notification (completed)
        logger.info(f"🔍 Completion email check for job {job_id}: user_email={user_email}, _email_is_enabled()={_email_is_enabled()}")
        if user_email and _email_is_enabled():
            logger.info(f"📧 Sending keyword completed email to {user_email}")
            try:
                await asyncio.to_thread(
                    _send_email,
                    user_email,
                    keyword_completed_subject(normalized, len(results)),
                    keyword_completed_html(normalized, len(results)),
                )
                logger.info(f"✅ Keyword completed email sent successfully to {user_email}")
            except Exception as e:
                logger.error(f"❌ Failed to send keyword completed email: {e}")
        else:
            logger.warning(f"⚠️ Completion email not sent: user_email={user_email}, email_enabled={_email_is_enabled()}")

        analysis_results[job_id] = response_data
        save_job_snapshot(job_id, response_data)
    except Exception as e:
        logger.error(f"Keyword job error for {job_id}: {e}")
        analysis_results[job_id] = {
            "success": False,
            "status": "failed",
            "error": str(e),
            "filename": job_id,
            "mode": "keywords_only",
        }
        save_job_snapshot(job_id, analysis_results[job_id])

@app.post("/search/keywords/schedule")
async def schedule_keyword_search(payload: KeywordScheduleRequest):
    try:
        if not payload.keywords or len(payload.keywords) == 0:
            return JSONResponse(status_code=400, content={"success": False, "error": "Please provide one or more keywords"})

        job_id = str(uuid.uuid4())
        analysis_results[job_id] = {"success": False, "status": "pending", "filename": job_id, "mode": "keywords_only"}
        save_job_snapshot(job_id, analysis_results[job_id])

        # Proactively send a "started" email if requested to confirm SMTP pipeline
        if payload.user_email and _email_is_enabled():
            try:
                await asyncio.to_thread(
                    _send_email,
                    payload.user_email,
                    keyword_started_subject(payload.keywords or []),
                    keyword_started_html(payload.keywords or []),
                )
            except Exception:
                pass

        asyncio.create_task(_run_keyword_search_job(job_id, payload.keywords or [], payload.user_email))
        return JSONResponse(status_code=202, content={"success": True, "status": "pending", "filename": job_id})
    except Exception as e:
        logger.error(f"Schedule keyword search error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/search/keywords/status/{job_id}")
async def keyword_search_status(job_id: str):
    try:
        if job_id not in analysis_results:
            snap = load_job_snapshot(job_id)
            if snap:
                analysis_results[job_id] = snap
        if job_id not in analysis_results:
            return JSONResponse(status_code=404, content={"success": False, "status": "not_found", "filename": job_id})
        result = analysis_results[job_id]
        code = 200
        if result.get("status") in {"pending", "processing"}:
            code = 202
        elif not result.get("success") and result.get("status") == "failed":
            code = 500
        return JSONResponse(status_code=code, content=result)
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "status": "failed", "error": str(e)})

@app.post("/analyze-part/")
async def analyze_part(
    file: UploadFile = File(...),
    keywords: Optional[str] = Query(None),
    confidence_threshold: float = Query(0.3),
    max_predictions: int = Query(3),
    user_email: Optional[str] = Query(None),
    background_tasks: BackgroundTasks = None
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
        keyword_list = [s.strip() for s in (keywords.split(",") if keywords else []) if s.strip()]

        # Initialize pending job and schedule background coroutine
        analysis_results[filename] = {
            "success": False,
            "status": "pending",
            "filename": filename
        }
        save_job_snapshot(filename, analysis_results[filename])

        # Persist initial record to database (part_searches) if Supabase is configured
        try:
            supabase_url = os.getenv("SUPABASE_URL", "").strip()
            service_key = (
                os.getenv("SUPABASE_SERVICE_KEY")
                or os.getenv("SUPABASE_ANON_KEY", "")
            ).strip()
            if supabase_url and service_key:
                client = create_client(supabase_url, service_key)
                image_public_url = None
                # Upload image to storage bucket if available
                bucket = os.getenv("SUPABASE_BUCKET_NAME") or os.getenv(
                    "S3_BUCKET_NAME", "sparefinder"
                )
                try:
                    with open(file_path, "rb") as f:
                        storage_path = f"uploads/{filename}"
                        client.storage.from_(bucket).upload(
                            storage_path,
                            f,
                            file_options={
                                "content-type": file.content_type or "image/jpeg",
                                "x-upsert": "true",
                            },
                        )
                        # Build public URL (assumes bucket is public)
                        image_public_url = (
                            client.storage.from_(bucket).get_public_url(storage_path).get(
                                "publicUrl"
                            )
                        )
                except Exception:
                    pass

                metadata = {
                    "filename": filename,
                    "upload_timestamp": int(time.time()),
                }
                client.from_("part_searches").insert(
                    {
                        "id": filename,
                        "user_id": None,  # Unknown at AI service level
                        "search_term": (keywords or "Image Upload"),
                        "search_type": "image_upload",
                        "image_url": image_public_url or f"/uploads/{filename}",
                        "image_name": file.filename,
                        "image_size_bytes": os.path.getsize(file_path),
                        "image_format": file.content_type or "image/jpeg",
                        "upload_source": "ai_service",
                        "analysis_status": "pending",
                        "metadata": metadata,
                    }
                ).execute()
        except Exception as e:
            logger.warning(f"Initial DB insert failed for {filename}: {e}")

        asyncio.create_task(
            _run_analysis_job(
                filename,
                file_path,
                keyword_list,
                confidence_threshold,
                max_predictions,
                user_email,
            )
        )

        return JSONResponse(
            status_code=202,
            content={
                "success": True,
                "status": "pending",
                "filename": filename,
                "message": "Analysis scheduled. Check status later."
            }
        )
    except Exception as e:
        logger.error(f"Analysis enqueue error: {str(e)}")
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
        # Try in-memory, then persistent snapshot
        if filename not in analysis_results:
            snap = load_job_snapshot(filename)
            if snap:
                analysis_results[filename] = snap
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
        
        # Retrieve stored result (pending/processing/final)
        result = analysis_results[filename]
        
        code = 200
        if result.get("status") in {"pending", "processing"}:
            code = 202
        elif not result.get("success") and result.get("status") == "failed":
            code = 500
        
        return JSONResponse(status_code=code, content=result)
    
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

@app.post("/suppliers/enrich")
async def suppliers_enrich(payload: Dict[str, Any]):
    try:
        urls = payload.get("urls") if isinstance(payload, dict) else None
        if not urls or not isinstance(urls, list):
            return JSONResponse(status_code=400, content={"success": False, "error": "invalid_request"})
        urls = [u for u in urls if isinstance(u, str) and u.startswith("http")][:10]
        results = []
        for u in urls:
            try:
                results.append(await scrape_supplier_page(u))
            except Exception as e:
                results.append({"success": False, "url": u, "error": str(e)})
        return JSONResponse(status_code=200, content={"success": True, "results": results})
    except Exception as e:
        logger.error(f"/suppliers/enrich error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.post("/suppliers/scrape")
async def scrape_supplier_contact(payload: Dict[str, Any]):
    """Enhanced scraper endpoint for extracting detailed contact information"""
    try:
        url = payload.get("url") if isinstance(payload, dict) else None
        if not url or not isinstance(url, str) or not url.startswith("http"):
            return JSONResponse(status_code=400, content={"success": False, "error": "invalid_url"})
        
        result = await enhanced_scrape_supplier_page(url)
        return JSONResponse(status_code=200, content=result)
    except Exception as e:
        logger.error(f"/suppliers/scrape error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.post("/suppliers/scrape-multiple")
async def scrape_multiple_suppliers_contact(payload: Dict[str, Any]):
    """Enhanced scraper endpoint for multiple supplier URLs"""
    try:
        urls = payload.get("urls") if isinstance(payload, dict) else None
        if not urls or not isinstance(urls, list):
            return JSONResponse(status_code=400, content={"success": False, "error": "invalid_urls"})
        
        # Filter and limit URLs
        valid_urls = [u for u in urls if isinstance(u, str) and u.startswith("http")][:10]
        if not valid_urls:
            return JSONResponse(status_code=400, content={"success": False, "error": "no_valid_urls"})
        
        results = await scrape_multiple_suppliers(valid_urls)
        return JSONResponse(status_code=200, content={"success": True, "results": results})
    except Exception as e:
        logger.error(f"/suppliers/scrape-multiple error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/jobs")
async def list_jobs():
    try:
        # Load all job snapshots from file system
        jobs = []
        jobs_dir = os.path.join(os.getcwd(), "uploads", "jobs")
        
        # First, add in-memory jobs
        for k, v in analysis_results.items():
            jobs.append({"id": k, **v})
        
        # Then, load job snapshots from file system
        if os.path.exists(jobs_dir):
            for filename in os.listdir(jobs_dir):
                if filename.endswith('.json'):
                    job_id = filename[:-5]  # Remove .json extension
                    # Skip if already in memory
                    if job_id not in analysis_results:
                        try:
                            job_data = load_job_snapshot(job_id)
                            if job_data:
                                jobs.append({"id": job_id, **job_data})
                        except Exception as e:
                            logger.warning(f"Failed to load job snapshot {job_id}: {e}")
        
        return JSONResponse(status_code=200, content={"success": True, "results": jobs})
    except Exception as e:
        logger.error(f"/jobs error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/jobs/pending")
async def list_pending_jobs():
    try:
        pending = []
        for k, v in analysis_results.items():
            if v.get("status") in {"pending", "processing"}:
                pending.append({"id": k, **v})
        return JSONResponse(status_code=200, content={"success": True, "results": pending})
    except Exception as e:
        logger.error(f"/jobs/pending error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

# -----------------------------
# Test utilities
# -----------------------------

@app.post("/test-email")
async def test_email(payload: Dict[str, Any]):
    """Send a simple test email to validate SMTP configuration.

    Request JSON:
    { "to": "user@example.com", "subject": "optional", "html": "<b>optional</b>" }
    """
    try:
        to_email = str(payload.get("to") or os.getenv("TEST_EMAIL_TO", "")).strip()
        if not to_email:
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": "missing_to",
                "message": "Provide 'to' or set TEST_EMAIL_TO"
            })

        subject = str(payload.get("subject") or "SpareFinderAI – SMTP Test")
        html = str(payload.get("html") or "<p>✅ This is a test email from SpareFinderAI Service.</p>")

        ok = await asyncio.to_thread(_send_email, to_email, subject, html)
        return JSONResponse(status_code=200, content={"success": bool(ok), "to": to_email})
    except Exception as e:
        logger.error(f"/test-email error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

# If running the script directly
if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True
    ) 