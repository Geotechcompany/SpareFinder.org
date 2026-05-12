"""Open pixel + click redirect tracking for marketing_sends (SMTP sends)."""

from __future__ import annotations

import base64
import logging
import os
import re
from urllib.parse import quote, urlparse

from .marketing_merge import marketing_link_base

logger = logging.getLogger(__name__)

# Standard 1x1 transparent GIF
_GIF_1X1 = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")


def tracking_enabled() -> bool:
    return (os.getenv("MARKETING_TRACKING_ENABLED") or "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def tracking_api_base() -> str:
    """Public base URL for /api/track/* (must reach this FastAPI service)."""
    return marketing_link_base().rstrip("/")


def inject_tracking_into_html(html: str, *, tracking_token: str) -> str:
    """
    Append open pixel and wrap http(s) anchor hrefs with click-through redirect.
    Skips mailto, javascript, unsubscribe, and existing /api/track/ links.
    """
    if not html or not tracking_token.strip():
        return html
    base = tracking_api_base()
    token = tracking_token.strip()
    pixel = (
        f'<img src="{base}/api/track/mopen/{token}" '
        'width="1" height="1" alt="" style="display:none" border="0" />'
    )

    def wrap_href(url: str) -> str:
        u = (url or "").strip()
        if not u:
            return u
        low = u.lower()
        if low.startswith("mailto:") or low.startswith("#") or low.startswith("javascript:"):
            return u
        if "/api/track/m" in low or "/unsubscribe/" in low:
            return u
        try:
            p = urlparse(u)
        except Exception:
            return u
        if p.scheme not in ("http", "https") or not p.netloc:
            return u
        if len(u) > 1800:
            return u
        return f"{base}/api/track/mclk/{quote(token, safe='')}?u={quote(u, safe='')}"

    def repl_dq(m: re.Match[str]) -> str:
        inner = m.group(1)
        return f'href="{wrap_href(inner)}"'

    def repl_sq(m: re.Match[str]) -> str:
        inner = m.group(1)
        return f"href='{wrap_href(inner)}'"

    out = re.sub(r'(?is)href\s*=\s*"([^"]+)"', repl_dq, html)
    out = re.sub(r"(?is)href\s*=\s*'([^']+)'", repl_sq, out)

    if re.search(r"(?is)</body\s*>", out):
        return re.sub(r"(?is)(</body\s*>)", pixel + r"\1", out, count=1)
    return out + pixel


def gif_pixel_response() -> tuple[bytes, dict[str, str]]:
    return _GIF_1X1, {"Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}


def validate_redirect_url(u: str) -> str | None:
    raw = (u or "").strip()
    if not raw or len(raw) > 2000:
        return None
    try:
        p = urlparse(raw)
    except Exception:
        return None
    if p.scheme not in ("http", "https") or not p.netloc:
        return None
    return raw
