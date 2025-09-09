import re
import asyncio
from typing import Dict, Any, Optional

import aiohttp
from bs4 import BeautifulSoup


async def _fetch_text(url: str, timeout: int = 15) -> Optional[str]:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
    }
    try:
        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.get(url, timeout=timeout, allow_redirects=True) as resp:
                if resp.status >= 200 and resp.status < 400:
                    return await resp.text(errors="ignore")
    except Exception:
        return None
    return None


def _extract_contact_info(text: str) -> Dict[str, Any]:
    # Emails
    emails = list({e.lower() for e in re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)})[:5]
    # Phones (simple international formats)
    phones = list({p for p in re.findall(r"\+?\d[\d\s().-]{7,}\d", text)})[:5]
    return {"emails": emails, "phones": phones}


def _extract_price_candidates(text: str) -> Optional[str]:
    # Simple heuristic: capture $ amounts and common currency symbols
    prices = re.findall(r"(?:\$|USD\s*)\s*\d{1,3}(?:[\,\s]\d{3})*(?:\.\d{2})?", text, flags=re.IGNORECASE)
    if prices:
        # Return a compact unique summary
        uniq = []
        for p in prices:
            if p not in uniq:
                uniq.append(p)
        return ", ".join(uniq[:5])
    return None


async def scrape_supplier_page(url: str) -> Dict[str, Any]:
    html = await _fetch_text(url)
    if not html:
        return {"success": False, "error": "fetch_failed"}
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    # Prefer visible text
    text = soup.get_text(" ", strip=True)

    contact = _extract_contact_info(text)
    price_summary = _extract_price_candidates(text)

    # Try to locate explicit contact links
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        label = (a.get_text() or "").strip().lower()
        if any(k in label for k in ["contact", "support", "sales"]) or any(k in href.lower() for k in ["contact", "support", "sales", "mailto:"]):
            links.append(href)
        if len(links) >= 10:
            break

    return {
        "success": True,
        "contact": contact,
        "price_summary": price_summary or "",
        "contact_links": links,
        "url": url,
    }


