"""
PDF Storage Utility
Uploads PDFs to Supabase Storage for persistent access
"""

import os
import logging
from typing import Optional
from pathlib import Path

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")


def upload_pdf_to_supabase_storage(
    pdf_path: str, 
    filename: Optional[str] = None,
    bucket_name: str = "sparefinder"
) -> Optional[str]:
    """
    Upload PDF to Supabase Storage and return public URL
    
    Args:
        pdf_path: Local path to the PDF file
        filename: Optional custom filename (defaults to basename of pdf_path)
        bucket_name: Supabase Storage bucket name (default: "sparefinder")
        
    Returns:
        Public URL of uploaded PDF, or None if upload failed
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning("⚠️ Supabase not configured - PDF will not be uploaded to storage")
            return None
        
        if not os.path.exists(pdf_path):
            logger.error(f"❌ PDF file not found: {pdf_path}")
            return None
        
        # Import supabase client
        try:
            from supabase import create_client
        except ImportError:
            logger.error("❌ supabase-py not installed - cannot upload PDF")
            return None
        
        # Create Supabase client
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Determine filename
        if not filename:
            filename = Path(pdf_path).name
        
        # Storage path: reports/{filename}
        storage_path = f"reports/{filename}"
        
        # Read PDF file
        with open(pdf_path, "rb") as pdf_file:
            pdf_data = pdf_file.read()
        
        logger.info(f"📤 Uploading PDF to Supabase Storage: {bucket_name}/{storage_path}")
        
        # Upload to Supabase Storage
        try:
            # Use upsert to overwrite if exists
            supabase.storage.from_(bucket_name).upload(
                storage_path,
                pdf_data,
                file_options={
                    "content-type": "application/pdf",
                    "x-upsert": "true",
                }
            )
            
            # Get public URL
            public_url_data = supabase.storage.from_(bucket_name).get_public_url(storage_path)
            public_url = public_url_data.get("publicUrl") if isinstance(public_url_data, dict) else str(public_url_data)
            
            logger.info(f"✅ PDF uploaded successfully: {public_url}")
            return public_url
            
        except Exception as upload_error:
            logger.error(f"❌ Failed to upload PDF to Supabase Storage: {upload_error}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error uploading PDF to Supabase Storage: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None

