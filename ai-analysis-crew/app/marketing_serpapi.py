"""SerpAPI Google search for marketing lead discovery."""

from __future__ import annotations

import logging
import os
import re
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_SERPAPI_URL = "https://serpapi.com/search.json"


def _extract_emails(text: str) -> list[str]:
    if not text:
        return []
    found = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    out: list[str] = []
    for e in found:
        el = e.strip().lower()
        if el not in out:
            out.append(el)
    return out


def search_google(*, query: str, num: int = 10, api_key: str | None = None) -> dict[str, Any]:
    """
    Call SerpAPI google engine. Requires SERPAPI_KEY in environment.
    Returns parsed JSON or raises on HTTP error / missing key.
    """
    resolved_key = (api_key or os.getenv("SERPAPI_KEY") or "").strip()
    if not resolved_key:
        raise ValueError("SERPAPI_KEY not configured")

    params = {
        "api_key": resolved_key,
        "engine": "google",
        "q": query,
        "num": max(1, min(num, 20)),
    }
    with httpx.Client(timeout=45.0) as client:
        r = client.get(_SERPAPI_URL, params=params)
        r.raise_for_status()
        return r.json()


def organic_results_to_lead_candidates(resp: dict[str, Any], *, query: str) -> list[dict[str, Any]]:
    """Map SerpAPI organic_results[] into preliminary lead dicts for sanitization."""
    organic = resp.get("organic_results") or []
    candidates: list[dict[str, Any]] = []
    for item in organic:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        link = str(item.get("link") or "").strip()
        snippet = str(item.get("snippet") or "").strip()
        combined = f"{title}\n{snippet}"
        emails = _extract_emails(combined)
        email = emails[0] if emails else None
        company_guess = title.split("|")[0].split("-")[0].strip() if title else ""

        candidates.append(
            {
                "email": email,
                "full_name": "",
                "company_name": company_guess,
                "job_title": "",
                "platform": "google",
                "source": "serpapi_google",
                "raw_payload": {
                    "serp_query": query,
                    "title": title,
                    "link": link,
                    "snippet": snippet,
                    "rank": item.get("position"),
                },
                "sanitization_status": "review" if not email else "accepted",
            }
        )
    return candidates
