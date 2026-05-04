"""Format support ticket message bodies for email (strip embedded images / data URIs)."""

from __future__ import annotations

import html
import re

_MD_IMAGE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")

# Placeholder inserted before escape; must not appear in escaped output differently.
_PH_IMG = "[[[SPF_IMAGE]]]"


def _is_embedded_image_url(url: str) -> bool:
    u = (url or "").strip()
    if u.startswith("data:image/"):
        return True
    if u.startswith(("http://", "https://")):
        path = u.split("?", 1)[0].lower()
        return any(path.endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"))
    return False


def format_ticket_message_plain_for_email(body: str, max_chars: int = 8000) -> str:
    """Plain text: replace markdown images (data URI or image URLs) with a short notice."""

    def repl(m: re.Match[str]) -> str:
        if _is_embedded_image_url(m.group(2)):
            return "\n[Image - open your ticket in SpareFinder to view]\n"
        return m.group(0)

    raw = (body or "")[:max_chars]
    out = _MD_IMAGE.sub(repl, raw)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def format_ticket_message_html_for_email(body: str, max_chars: int = 8000) -> str:
    """HTML fragment: escaped text with line breaks; images become a styled callout (no data URIs)."""

    def repl(m: re.Match[str]) -> str:
        if _is_embedded_image_url(m.group(2)):
            return f"\n{_PH_IMG}\n"
        return m.group(0)

    raw = (body or "")[:max_chars]
    text = _MD_IMAGE.sub(repl, raw)
    text = re.sub(r"\n{3,}", "\n\n", text)
    esc = html.escape(text)
    note = (
        '<div style="margin:10px 0;padding:10px 12px;border-radius:8px;background:#f1f5f9;'
        'border:1px solid #e2e8f0;color:#334155;font-size:14px;line-height:1.45">'
        "<strong>Photo attached</strong> - most inboxes cannot show inline images here. "
        "Open your ticket in SpareFinder to see the full message and pictures."
        "</div>"
    )
    esc = esc.replace(_PH_IMG, note)
    esc = esc.replace("\n", "<br />\n")
    return f'<div style="line-height:1.55;color:#1e293b;font-size:15px">{esc}</div>'
