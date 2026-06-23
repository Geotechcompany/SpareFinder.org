"""Merge-field replacement for marketing templates."""

from __future__ import annotations

import os
import re
from typing import Any


def marketing_link_base() -> str:
    """Base URL for unsubscribe and API-served links (falls back to FRONTEND_URL)."""
    return (
        (os.getenv("MARKETING_LINK_BASE_URL") or os.getenv("API_PUBLIC_URL") or os.getenv("FRONTEND_URL") or "https://sparefinder.org")
        .strip()
        .rstrip("/")
    )


def _first_name(full_name: str | None) -> str:
    if not full_name or not str(full_name).strip():
        return "there"
    parts = str(full_name).strip().split()
    return parts[0] if parts else "there"


def lead_to_merge_dict(
    lead: dict[str, Any],
    *,
    frontend_url: str,
    unsubscribe_token: str,
    extra: dict[str, str] | None = None,
) -> dict[str, str]:
    """Build merge token map from a marketing_leads row."""
    full_name = lead.get("sanitized_full_name") or lead.get("full_name") or ""
    company = lead.get("sanitized_company_name") or lead.get("company_name") or ""
    job = lead.get("sanitized_job_title") or lead.get("job_title") or ""
    email = (lead.get("email") or "").strip()
    payload = lead.get("raw_payload") if isinstance(lead.get("raw_payload"), dict) else {}
    platform = lead.get("platform") or (payload.get("platform") if isinstance(payload, dict) else "") or ""

    link_base = marketing_link_base()

    base: dict[str, str] = {
        "first_name": _first_name(str(full_name)),
        "full_name": str(full_name).strip() or "there",
        "company": str(company).strip() or "your team",
        "job_title": str(job).strip() or "",
        "email": email,
        "platform": str(platform).strip(),
        "frontend_url": frontend_url.rstrip("/"),
        "unsubscribe_token": unsubscribe_token,
        "unsubscribe_url": f"{link_base}/unsubscribe/marketing?token={unsubscribe_token}",
    }
    # Caller may pass support_email (and other tokens) via extra.
    if extra:
        base.update({k: str(v) for k, v in extra.items()})
    return base


_MERGE_PATTERN = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")


def apply_merge(template: str | None, ctx: dict[str, str]) -> str:
    """Replace {{token}} with values from ctx (missing keys become empty string)."""

    def repl(match: re.Match[str]) -> str:
        key = match.group(1)
        return ctx.get(key, "")

    if not template:
        return ""
    return _MERGE_PATTERN.sub(repl, template)


def html_to_plain(html: str) -> str:
    """Very small HTML strip for plain-text fallback."""
    text = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", html or "")
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text
