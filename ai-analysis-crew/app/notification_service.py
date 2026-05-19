"""In-app notifications for crew analysis and related events."""

from __future__ import annotations

import logging
from typing import Any, Optional

import requests

from .database_storage import SUPABASE_HEADERS, SUPABASE_KEY, SUPABASE_URL, get_user_id_from_email

logger = logging.getLogger(__name__)

HISTORY_ACTION_URL = "/dashboard/history"


def _insert_notification(
    user_id: str,
    title: str,
    message: str,
    ntype: str,
    *,
    action_url: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> bool:
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning("Supabase not configured - skipping notification insert")
        return False

    row: dict[str, Any] = {
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": ntype,
        "read": False,
    }
    if action_url:
        row["action_url"] = action_url
    if metadata:
        row["metadata"] = metadata

    try:
        url = f"{SUPABASE_URL}/rest/v1/notifications"
        response = requests.post(url, headers=SUPABASE_HEADERS, json=row)
        if response.status_code not in (200, 201):
            logger.error(
                "Failed to insert notification: %s - %s",
                response.status_code,
                response.text,
            )
            return False
        return True
    except Exception as exc:
        logger.error("Notification insert error: %s", exc)
        return False


def _analysis_label(
    *,
    image_name: Optional[str] = None,
    keywords: Optional[str] = None,
) -> str:
    if image_name:
        return image_name
    if keywords:
        trimmed = keywords.strip()
        if len(trimmed) > 72:
            return f"{trimmed[:69]}…"
        return trimmed
    return "your part"


def notify_analysis_started(
    user_id: str,
    job_id: str,
    *,
    image_name: Optional[str] = None,
    keywords: Optional[str] = None,
) -> bool:
    label = _analysis_label(image_name=image_name, keywords=keywords)
    return _insert_notification(
        user_id,
        "Analysis started",
        f"SpareFinder AI is analyzing {label}. Open History to watch live progress.",
        "info",
        action_url=HISTORY_ACTION_URL,
        metadata={
            "category": "analysis",
            "event": "started",
            "job_id": job_id,
            "image_name": image_name,
        },
    )


def notify_analysis_completed(
    user_id: str,
    job_id: str,
    *,
    image_name: Optional[str] = None,
    keywords: Optional[str] = None,
) -> bool:
    label = _analysis_label(image_name=image_name, keywords=keywords)
    return _insert_notification(
        user_id,
        "Analysis complete",
        f"Your report for {label} is ready. View results in History or check your email.",
        "success",
        action_url=HISTORY_ACTION_URL,
        metadata={
            "category": "analysis",
            "event": "completed",
            "job_id": job_id,
            "image_name": image_name,
        },
    )


def notify_analysis_failed(
    user_id: str,
    job_id: str,
    *,
    image_name: Optional[str] = None,
    keywords: Optional[str] = None,
    error_message: Optional[str] = None,
) -> bool:
    label = _analysis_label(image_name=image_name, keywords=keywords)
    detail = (
        f" Analysis for {label} could not be completed."
        + (f" {error_message[:120]}" if error_message else " Please try again from Upload.")
    )
    return _insert_notification(
        user_id,
        "Analysis failed",
        detail.strip(),
        "error",
        action_url=HISTORY_ACTION_URL,
        metadata={
            "category": "analysis",
            "event": "failed",
            "job_id": job_id,
            "image_name": image_name,
        },
    )


def resolve_user_id(user_id: Optional[str], user_email: Optional[str]) -> Optional[str]:
    if user_id:
        return user_id
    if user_email:
        return get_user_id_from_email(user_email)
    return None
