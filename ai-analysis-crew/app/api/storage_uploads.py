"""Shared Supabase Storage helpers for profile and workspace images."""

from __future__ import annotations

import logging
import os
import re
import uuid
from typing import Optional

logger = logging.getLogger(__name__)

_BUCKET = "sparefinder"
_ALLOWED_CT = frozenset({"image/jpeg", "image/png", "image/webp"})
_CT_SUFFIX = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
_PROFILE_IMAGE_MAX_BYTES = 4 * 1024 * 1024
_WORKSPACE_IMAGE_MAX_BYTES = 4 * 1024 * 1024
_SAFE_ID_RE = re.compile(r"^[0-9a-fA-F-]{8,128}$")


def normalize_image_content_type(content_type: str | None) -> str | None:
    raw = (content_type or "").split(";")[0].strip().lower()
    return raw if raw in _ALLOWED_CT else None


def validate_profile_image(*, image_data: bytes, content_type: str) -> str | None:
    if content_type not in _ALLOWED_CT:
        return "Only JPEG, PNG, or WebP images are allowed"
    if not image_data:
        return "Empty file"
    if len(image_data) > _PROFILE_IMAGE_MAX_BYTES:
        return "Image too large (max 4 MB)"
    return None


def validate_workspace_image(*, image_data: bytes, content_type: str) -> str | None:
    if content_type not in _ALLOWED_CT:
        return "Only JPEG, PNG, or WebP images are allowed"
    if not image_data:
        return "Empty file"
    if len(image_data) > _WORKSPACE_IMAGE_MAX_BYTES:
        return "Image too large (max 4 MB)"
    return None


def _public_url(supabase: object, bucket: str, storage_path: str) -> str:
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or ""
    try:
        public_url_response = supabase.storage.from_(bucket).get_public_url(storage_path)  # type: ignore[attr-defined]
        if isinstance(public_url_response, dict):
            url = public_url_response.get("publicUrl") or public_url_response.get("url")
        elif hasattr(public_url_response, "data"):
            data = public_url_response.data
            url = data.get("publicUrl") if isinstance(data, dict) else str(data)
        else:
            url = str(public_url_response)
        if url and not str(url).startswith("None"):
            return str(url)
    except Exception as exc:
        logger.warning("Could not resolve public URL, building manually: %s", exc)
    return f"{supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/{storage_path}"


def upload_public_image(
    *,
    supabase: object,
    storage_path: str,
    image_data: bytes,
    content_type: str,
    upsert: bool = True,
) -> tuple[Optional[str], Optional[str]]:
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        return None, "File storage is not configured"

    suffix = _CT_SUFFIX.get(content_type, ".jpg")
    if not storage_path.endswith(suffix):
        storage_path = f"{storage_path.rsplit('.', 1)[0]}{suffix}"

    try:
        upload_result = supabase.storage.from_(_BUCKET).upload(  # type: ignore[attr-defined]
            storage_path,
            image_data,
            file_options={"content-type": content_type, "x-upsert": str(upsert).lower()},
        )
        if not upload_result:
            return None, "Upload failed"
        return _public_url(supabase, _BUCKET, storage_path), None
    except Exception as exc:
        logger.exception("Storage upload failed: %s", exc)
        return None, "Upload failed"


def build_avatar_storage_path(user_id: str, content_type: str) -> str | None:
    if not _SAFE_ID_RE.match((user_id or "").strip()):
        return None
    suffix = _CT_SUFFIX.get(content_type, ".jpg")
    return f"avatars/{user_id.strip()}/{uuid.uuid4().hex}{suffix}"


def build_workspace_image_storage_path(workspace_id: str, content_type: str) -> str | None:
    if not _SAFE_ID_RE.match((workspace_id or "").strip()):
        return None
    suffix = _CT_SUFFIX.get(content_type, ".jpg")
    return f"workspaces/{workspace_id.strip()}/{uuid.uuid4().hex}{suffix}"
