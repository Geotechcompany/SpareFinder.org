import os
import json
import logging
from typing import Optional, Dict, Any

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


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
                    return json.loads(res.decode("utf-8"))
                except Exception:
                    return None
    except Exception as e:
        # Parse the error to provide more context
        error_str = str(e)
        if "404" in error_str or "not_found" in error_str.lower():
            logger.debug(f"Job snapshot not found in storage for {filename} (will use local cache if available)")
        else:
            logger.warning(f"Supabase Storage download failed for {filename}: {e}")

    return None


