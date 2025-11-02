import os
import json
import logging
import time
from typing import Optional, Dict, Any

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Circuit breaker for failed downloads
_failed_downloads = {}
_max_failures = 3
_failure_window = 300  # 5 minutes


# Local filesystem snapshot directory
def _jobs_dir() -> str:
    base = os.path.join(os.getcwd(), "uploads", "jobs")
    os.makedirs(base, exist_ok=True)
    return base


def save_job_snapshot(filename: str, payload: Dict[str, Any]) -> None:
    try:
        path = os.path.join(_jobs_dir(), f"{filename}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Failed to write local job snapshot for {filename}: {e}")

    # Optional: upload to Supabase Storage if configured
    try:
        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_key = (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")).strip()
        bucket = os.getenv("SUPABASE_BUCKET_NAME") or os.getenv("S3_BUCKET_NAME", "sparefinder")
        if supabase_url and supabase_key:
            from supabase import create_client

            client = create_client(supabase_url, supabase_key)
            data_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            storage_path = f"jobs/{filename}.json"
            # Upsert upload with proper content type
            client.storage.from_(bucket).upload(
                storage_path,
                data_bytes,
                file_options={
                    "content-type": "application/json",
                    "x-upsert": "true",
                },
            )
    except Exception as e:
        logger.warning(f"Supabase Storage upload failed for {filename}: {e}")


def load_job_snapshot(filename: str) -> Optional[Dict[str, Any]]:
    # Strip common image extensions if present (job snapshots are JSON files)
    for ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp']:
        if filename.lower().endswith(ext):
            filename = filename[:-len(ext)]
            break
    
    # Local first
    try:
        path = os.path.join(_jobs_dir(), f"{filename}.json")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to read local job snapshot for {filename}: {e}")

    # Circuit breaker check for Supabase Storage
    now = time.time()
    if filename in _failed_downloads:
        failures = _failed_downloads[filename]
        # Clean old failures outside the window
        failures = [f for f in failures if now - f < _failure_window]
        _failed_downloads[filename] = failures
        
        if len(failures) >= _max_failures:
            logger.debug(f"Circuit breaker open for {filename}, skipping Supabase Storage download")
            return None

    # Supabase Storage fallback
    try:
        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_key = (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")).strip()
        bucket = os.getenv("SUPABASE_BUCKET_NAME") or os.getenv("S3_BUCKET_NAME", "sparefinder")
        if supabase_url and supabase_key:
            from supabase import create_client

            client = create_client(supabase_url, supabase_key)
            storage_path = f"jobs/{filename}.json"
            res = client.storage.from_(bucket).download(storage_path)
            if res:
                try:
                    # Reset circuit breaker on success
                    if filename in _failed_downloads:
                        del _failed_downloads[filename]
                    return json.loads(res.decode("utf-8"))
                except Exception:
                    return None
    except Exception as e:
        # Record failure for circuit breaker
        if filename not in _failed_downloads:
            _failed_downloads[filename] = []
        _failed_downloads[filename].append(now)
        
        # Only log warning if not too many failures
        if len(_failed_downloads[filename]) <= _max_failures:
            # Parse the error to provide more context
            error_str = str(e)
            if "404" in error_str or "not_found" in error_str.lower():
                logger.debug(f"Job snapshot not found in storage for {filename} (will use local cache if available)")
            else:
                logger.warning(f"Supabase Storage download failed for {filename}: {e}")
        else:
            logger.debug(f"Supabase Storage download failed for {filename} (circuit breaker): {e}")

    return None


