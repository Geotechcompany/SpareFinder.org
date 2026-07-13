"""Email alerts for platform errors (admin, user API, marketing, cron)."""

from __future__ import annotations

import hashlib
import html
import json
import logging
import os
import time
from typing import Any

from .email_sender import send_basic_email_smtp, send_email_via_email_service
from .marketing_outbound_defaults import get_marketing_settings_row

logger = logging.getLogger(__name__)

_THROTTLE: dict[str, float] = {}
_THROTTLE_SECONDS = 900  # 15 minutes per fingerprint


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _system_settings_notify_email(supabase: Any) -> str:
    try:
        res = (
            supabase.table("system_settings")
            .select("setting_value")
            .eq("category", "notifications")
            .eq("setting_key", "error_notify_email")
            .limit(1)
            .execute()
        )
        rows = res.data or []
        if rows:
            raw = rows[0].get("setting_value")
            if isinstance(raw, str):
                val = raw.strip().strip('"').lower()
                if val and "@" in val:
                    return val
    except Exception as exc:
        logger.debug("system_settings error_notify_email: %s", exc)
    return ""


def resolve_error_notify_email(supabase: Any) -> str:
    """
    Dev/ops inbox for failure alerts.
    Env ERROR_NOTIFY_EMAIL (or legacy ADMIN_NOTIFY_EMAIL) overrides admin UI when set.
    """
    env = (
        _env("ERROR_NOTIFY_EMAIL")
        or _env("MARKETING_ERROR_NOTIFY_EMAIL")
        or _env("ADMIN_NOTIFY_EMAIL")
    )
    if env and "@" in env:
        return env.strip().lower()

    try:
        sys_email = _system_settings_notify_email(supabase)
        if sys_email:
            return sys_email
    except Exception:
        pass

    try:
        row = get_marketing_settings_row(supabase)
        val = row.get("setting_value") or {}
        configured = str(val.get("error_notify_email") or "").strip().lower()
        if configured and "@" in configured:
            return configured
    except Exception as exc:
        logger.warning("resolve_error_notify_email: %s", exc)
    return ""


def resolve_error_notify_recipients(supabase: Any) -> list[str]:
    """Resolve a comma or semicolon separated, de-duplicated recipient list."""
    raw = resolve_error_notify_email(supabase)
    recipients: list[str] = []
    for candidate in raw.replace(";", ",").split(","):
        email = candidate.strip().lower()
        if email and "@" in email and email not in recipients:
            recipients.append(email)
    return recipients


def _fingerprint(*, severity: str, message: str, source: str = "", path: str = "") -> str:
    raw = f"{source}:{path}:{severity}:{message[:500]}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def _prune_throttle(now: float) -> None:
    if len(_THROTTLE) <= 300:
        return
    cutoff = now - _THROTTLE_SECONDS
    for key in list(_THROTTLE.keys()):
        if _THROTTLE[key] < cutoff:
            del _THROTTLE[key]


def send_error_notify_email(
    supabase: Any,
    *,
    severity: str,
    message: str,
    source: str = "api",
    area: str = "user",
    context: dict[str, Any] | None = None,
    http_path: str | None = None,
) -> bool:
    """Send a throttled alert email for platform failures."""
    sev = (severity or "error").strip().lower()
    if sev not in ("warning", "error", "critical"):
        return False

    recipients = resolve_error_notify_recipients(supabase)
    if not recipients:
        return False

    fp = _fingerprint(severity=sev, message=message, source=source, path=http_path or "")
    now = time.time()
    last = _THROTTLE.get(fp, 0.0)
    if now - last < _THROTTLE_SECONDS:
        return False
    _THROTTLE[fp] = now
    _prune_throttle(now)

    ctx_txt = ""
    if context:
        try:
            ctx_txt = json.dumps(context, ensure_ascii=False, indent=2)[:4000]
        except Exception:
            ctx_txt = str(context)[:4000]

    area_label = (area or "user").strip().lower()
    source_label = (source or "api").strip().lower()
    plain_lines = [
        f"Severity: {sev}",
        f"Area: {area_label}",
        f"Source: {source_label}",
        "",
        message,
    ]
    if ctx_txt:
        plain_lines.extend(["", "Context:", ctx_txt])
    text = "\n".join(plain_lines)
    body_html = (
        f"<h2 style=\"font-family:system-ui,sans-serif;color:#0f172a;\">"
        f"SpareFinder {html.escape(area_label)} {html.escape(sev)}</h2>"
        f"<p style=\"font-family:system-ui,sans-serif;color:#64748b;font-size:13px;\">"
        f"Source: {html.escape(source_label)}</p>"
        f"<pre style=\"font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap;"
        f"background:#f8fafc;padding:12px;border-radius:8px;\">{html.escape(text)}</pre>"
    )
    subject = f"[SpareFinder {area_label} {sev}] {message[:100]}"

    delivered = False
    for to_email in recipients:
        ok = send_basic_email_smtp(to_email=to_email, subject=subject, html=body_html, text=text)
        if not ok:
            ok = bool(
                send_email_via_email_service(
                    to_email=to_email, subject=subject, html=body_html, text=text
                )
            )
        delivered = delivered or ok
    return delivered

# Backward-compatible alias
notify_marketing_error = send_error_notify_email
