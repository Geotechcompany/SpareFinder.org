"""Format support ticket message bodies for email (data URIs vs public image URLs)."""

from __future__ import annotations

import html
import re

_MD_IMAGE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")

# Cap input size before regex (avoids pathological multi‑MB bodies); still large enough for real tickets.
_MAX_BODY_PROCESS_CHARS = 2_000_000

# Placeholder inserted before escape; must not appear in escaped output differently.
_PH_IMG_DATA = "[[[SPF_IMAGE_DATA]]]"

_IMG_EXTS = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg")


def _path_looks_like_image_url(url: str) -> bool:
    u = (url or "").strip()
    path = u.split("?", 1)[0].lower()
    return any(path.endswith(ext) for ext in _IMG_EXTS)


def _is_data_uri_image(url: str) -> bool:
    return (url or "").strip().startswith("data:image/")


def _is_https_image_markdown(url: str) -> bool:
    """Public HTTPS URL to a raster/vector file — safe to embed as <img src> in HTML email."""
    u = (url or "").strip()
    if not u.startswith("https://"):
        return False
    return _path_looks_like_image_url(u)


def format_ticket_message_plain_for_email(body: str, max_chars: int = 8000) -> str:
    """Plain text: data URIs become a short notice; HTTPS image links stay as a readable URL line."""

    def repl(m: re.Match[str]) -> str:
        url = m.group(2).strip()
        if _is_data_uri_image(url):
            return "\n[Image - open your ticket in SpareFinder to view]\n"
        if _is_https_image_markdown(url):
            return f"\n[Image] {url}\n"
        return m.group(0)

    # Strip images on the full body first. Truncating before regex breaks long data: URIs
    # (no closing ")" in the first max_chars), so the raw ![...](data:...) leaks into email.
    raw = (body or "")[:_MAX_BODY_PROCESS_CHARS]
    out = _MD_IMAGE.sub(repl, raw)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()[:max_chars]


def format_ticket_message_html_for_email(body: str, max_chars: int = 8000) -> str:
    """HTML fragment: escaped text; data URIs → callout; HTTPS image markdown → inline <img>."""

    url_slots: list[tuple[str, str, str]] = []  # (token, url, alt)

    def repl(m: re.Match[str]) -> str:
        alt_raw = m.group(1) or "image"
        url = m.group(2).strip()
        if _is_data_uri_image(url):
            return f"\n{_PH_IMG_DATA}\n"
        if _is_https_image_markdown(url):
            idx = len(url_slots)
            token = f"[[[SPF_IMG_URL_{idx}]]]"
            url_slots.append((token, url, alt_raw))
            return f"\n{token}\n"

        return m.group(0)

    raw = (body or "")[:_MAX_BODY_PROCESS_CHARS]
    text = _MD_IMAGE.sub(repl, raw)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text[:max_chars]
    esc = html.escape(text)

    data_note = (
        '<div style="margin:10px 0;padding:10px 12px;border-radius:8px;background:#f1f5f9;'
        'border:1px solid #e2e8f0;color:#334155;font-size:14px;line-height:1.45">'
        "<strong>Photo attached</strong> - this message included an inline image that cannot be shown in email. "
        "Open your ticket in SpareFinder to see the full message and pictures."
        "</div>"
    )
    esc = esc.replace(_PH_IMG_DATA, data_note)

    for token, url, alt_raw in url_slots:
        safe_src = html.escape(url, quote=True)
        safe_alt = html.escape(alt_raw, quote=True)
        img = (
            f'<img src="{safe_src}" alt="{safe_alt}" width="560" '
            'style="max-width:100%;width:auto;height:auto;border-radius:8px;margin:10px 0;'
            'display:block;border:1px solid #e2e8f0" />'
        )
        esc = esc.replace(token, img)

    esc = esc.replace("\n", "<br />\n")
    return f'<div style="line-height:1.55;color:#1e293b;font-size:15px">{esc}</div>'
