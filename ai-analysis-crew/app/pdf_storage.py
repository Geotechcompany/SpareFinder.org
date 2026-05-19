"""
PDF Storage Utility
Uploads PDFs to Supabase Storage for persistent access
"""

import logging
import os
import time
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import requests

logger = logging.getLogger(__name__)

# Supabase configuration (align with other modules that read VITE_* fallbacks)
SUPABASE_URL = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").strip().rstrip("/")
SUPABASE_KEY = (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or "").strip()
SUPABASE_PDF_BUCKET = (os.getenv("SUPABASE_PDF_BUCKET") or "documents").strip()
_UPLOAD_TIMEOUT_SEC = 120
_UPLOAD_RETRIES = 3


def _storage_headers(content_type: str, *, upsert: bool = True) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": content_type,
        "x-upsert": "true" if upsert else "false",
    }


def _public_url(bucket: str, storage_path: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{storage_path}"


def _upload_via_rest(
    *,
    bucket: str,
    storage_path: str,
    pdf_data: bytes,
    content_type: str,
) -> None:
    """Upload using Supabase Storage REST API (more reliable than SDK over flaky links)."""
    encoded_path = quote(storage_path, safe="/")
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{encoded_path}"
    response = requests.post(
        url,
        data=pdf_data,
        headers=_storage_headers(content_type),
        timeout=(15, _UPLOAD_TIMEOUT_SEC),
    )
    if response.status_code not in (200, 201):
        raise RuntimeError(
            f"HTTP {response.status_code}: {(response.text or '')[:500]}"
        )


def _is_retryable_error(exc: BaseException) -> bool:
    if isinstance(exc, (requests.exceptions.ConnectionError, requests.exceptions.Timeout)):
        return True
    msg = str(exc).lower()
    return any(
        token in msg
        for token in (
            "server disconnected",
            "connection reset",
            "connection aborted",
            "broken pipe",
            "timed out",
            "remote end closed",
        )
    )


def _upload_with_retries(
    *,
    bucket: str,
    storage_path: str,
    pdf_data: bytes,
) -> None:
    last_error: Optional[Exception] = None
    content_types = ("application/pdf", "application/octet-stream")

    for attempt in range(1, _UPLOAD_RETRIES + 1):
        for content_type in content_types:
            try:
                _upload_via_rest(
                    bucket=bucket,
                    storage_path=storage_path,
                    pdf_data=pdf_data,
                    content_type=content_type,
                )
                return
            except Exception as exc:
                last_error = exc
                msg = str(exc).lower()
                if (
                    content_type == "application/pdf"
                    and "mime type application/pdf is not supported" in msg
                ):
                    logger.warning(
                        "Bucket %s rejected application/pdf; retrying as octet-stream",
                        bucket,
                    )
                    continue
                if _is_retryable_error(exc) and attempt < _UPLOAD_RETRIES:
                    delay = min(2 ** attempt, 8)
                    logger.warning(
                        "PDF upload attempt %s/%s failed (%s); retrying in %ss",
                        attempt,
                        _UPLOAD_RETRIES,
                        exc,
                        delay,
                    )
                    time.sleep(delay)
                    break
                if content_type == content_types[-1]:
                    raise
        else:
            continue
        continue

    if last_error:
        raise last_error


def upload_pdf_to_supabase_storage(
    pdf_path: str,
    filename: Optional[str] = None,
    bucket_name: str = "sparefinder",
) -> Optional[str]:
    """
    Upload PDF to Supabase Storage and return public URL

    Args:
        pdf_path: Local path to the PDF file
        filename: Optional custom filename (defaults to basename of pdf_path)
        bucket_name: Fallback bucket if SUPABASE_PDF_BUCKET is unset

    Returns:
        Public URL of uploaded PDF, or None if upload failed
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning("Supabase not configured - PDF will not be uploaded to storage")
            return None

        if not os.path.exists(pdf_path):
            logger.error("PDF file not found: %s", pdf_path)
            return None

        if not filename:
            filename = Path(pdf_path).name

        storage_path = f"reports/{filename}"
        file_size_mb = os.path.getsize(pdf_path) / (1024 * 1024)

        with open(pdf_path, "rb") as pdf_file:
            pdf_data = pdf_file.read()

        buckets: list[str] = []
        for candidate in (SUPABASE_PDF_BUCKET, bucket_name, "documents", "sparefinder"):
            if candidate and candidate not in buckets:
                buckets.append(candidate)

        last_error: Optional[Exception] = None
        for bucket in buckets:
            try:
                logger.info(
                    "Uploading PDF to Supabase Storage: %s/%s (%.2f MB)",
                    bucket,
                    storage_path,
                    file_size_mb,
                )
                _upload_with_retries(
                    bucket=bucket,
                    storage_path=storage_path,
                    pdf_data=pdf_data,
                )
                public_url = _public_url(bucket, storage_path)
                logger.info("PDF uploaded successfully: %s", public_url)
                return public_url
            except Exception as bucket_error:
                last_error = bucket_error
                logger.warning(
                    "PDF upload failed for bucket %s: %s",
                    bucket,
                    bucket_error,
                )

        if last_error:
            logger.error("Failed to upload PDF to Supabase Storage: %s", last_error)
        return None

    except Exception as e:
        logger.error("Error uploading PDF to Supabase Storage: %s", e)
        import traceback

        logger.error(traceback.format_exc())
        return None
