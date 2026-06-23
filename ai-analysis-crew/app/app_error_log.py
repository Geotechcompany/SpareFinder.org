"""Central platform error logging + dev email alerts."""

from __future__ import annotations

import logging
import threading
from typing import Any

from .error_notify import send_error_notify_email
from .api.supabase_admin import get_supabase_admin

logger = logging.getLogger(__name__)


def _area_from_path(path: str | None) -> str:
    p = (path or "").lower()
    if "/admin" in p:
        return "admin"
    if p.startswith("/api/cron"):
        return "system"
    return "user"


def log_app_error(
    supabase: Any,
    *,
    severity: str,
    message: str,
    source: str = "api",
    area: str | None = None,
    context: dict[str, Any] | None = None,
    http_status: int | None = None,
    http_path: str | None = None,
    http_method: str | None = None,
    notify: bool = True,
) -> None:
    """Persist to app_errors and optionally email the configured dev address."""
    sev = (severity or "error").strip().lower()
    if sev not in ("info", "warning", "error", "critical"):
        sev = "error"
    area_val = (area or _area_from_path(http_path)).strip().lower()
    if area_val not in ("admin", "user", "system"):
        area_val = "user"

    row = {
        "source": (source or "api")[:64],
        "area": area_val,
        "severity": sev,
        "message": (message or "Unknown error")[:5000],
        "context": context or {},
        "http_status": http_status,
        "http_path": (http_path or "")[:500] or None,
        "http_method": (http_method or "")[:16] or None,
    }
    try:
        supabase.table("app_errors").insert(row).execute()
    except Exception as exc:
        logger.warning("app_errors insert failed (run docs/sql/create_app_errors.sql): %s", exc)

    if notify:
        try:
            send_error_notify_email(
                supabase,
                severity=sev,
                message=row["message"],
                source=row["source"],
                area=area_val,
                context={
                    **(context or {}),
                    **({"http_status": http_status} if http_status is not None else {}),
                    **({"http_path": http_path} if http_path else {}),
                    **({"http_method": http_method} if http_method else {}),
                },
                http_path=http_path,
            )
        except Exception as exc:
            logger.warning("error notify failed: %s", exc)


def _log_app_error_sync(**kwargs: Any) -> None:
    try:
        supabase = get_supabase_admin()
        log_app_error(supabase, **kwargs)
    except Exception as exc:
        logger.warning("background log_app_error failed: %s", exc)


def schedule_log_app_error(**kwargs: Any) -> None:
    """Fire-and-forget logging from sync middleware / handlers."""
    threading.Thread(target=_log_app_error_sync, kwargs=kwargs, daemon=True).start()


def http_status_severity(status_code: int) -> str | None:
    """Map HTTP status to log severity; None = skip."""
    if status_code >= 500:
        return "critical"
    if status_code in (403, 429, 502, 503):
        return "error"
    if status_code >= 400:
        return "warning"
    return None


def should_log_http_status(status_code: int) -> bool:
    if status_code in (401, 404):
        return False
    return http_status_severity(status_code) is not None
