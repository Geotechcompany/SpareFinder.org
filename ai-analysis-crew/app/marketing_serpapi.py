"""SerpAPI Google search for marketing lead discovery."""

from __future__ import annotations

import logging
import os
import re
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_SERPAPI_URL = "https://serpapi.com/search.json"
_SERPER_URL = "https://google.serper.dev/search"


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


def _resolve_search_provider(explicit: str | None) -> str:
    p = (explicit or os.getenv("MARKETING_GOOGLE_SEARCH_PROVIDER") or "serpapi").strip().lower()
    if p in ("serper", "serper.dev", "google.serper"):
        return "serper"
    return "serpapi"


def _search_serpapi(
    *,
    query: str,
    num: int,
    api_key: str,
    gl: str | None,
    hl: str | None,
) -> dict[str, Any]:
    params: dict[str, Any] = {
        "api_key": api_key,
        "engine": "google",
        "q": query,
        "num": max(1, min(num, 20)),
    }
    gl_u = (gl or os.getenv("SERPAPI_GL") or "").strip()
    hl_u = (hl or os.getenv("SERPAPI_HL") or "").strip()
    if gl_u:
        params["gl"] = gl_u
    if hl_u:
        params["hl"] = hl_u

    with httpx.Client(timeout=45.0) as client:
        r = client.get(_SERPAPI_URL, params=params)
        r.raise_for_status()
        data = r.json()
    err = data.get("error")
    if err:
        raise ValueError(str(err))
    return data


def _search_serper(
    *,
    query: str,
    num: int,
    api_key: str,
    gl: str | None,
    hl: str | None,
) -> dict[str, Any]:
    """Serper.dev — POST JSON, auth via X-API-KEY (not SerpAPI)."""
    body: dict[str, Any] = {
        "q": query,
        "num": max(1, min(num, 100)),
    }
    gl_u = (gl or os.getenv("SERPAPI_GL") or "").strip()
    hl_u = (hl or os.getenv("SERPAPI_HL") or "").strip()
    if gl_u:
        body["gl"] = gl_u
    if hl_u:
        body["hl"] = hl_u

    with httpx.Client(timeout=45.0) as client:
        r = client.post(
            _SERPER_URL,
            headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            json=body,
        )
        r.raise_for_status()
        data = r.json()
    err = data.get("error") or data.get("message")
    if err and isinstance(err, str):
        raise ValueError(err)
    if err:
        raise ValueError(str(err))
    # Normalize to SerpAPI-like shape for downstream mapping
    organic = data.get("organic") or []
    out = dict(data)
    out["organic_results"] = organic
    return out


def search_google(
    *,
    query: str,
    num: int = 10,
    api_key: str | None = None,
    gl: str | None = None,
    hl: str | None = None,
    provider: str | None = None,
) -> dict[str, Any]:
    """
    Google web results via SerpAPI (serpapi.com) or Serper.dev (google.serper.dev).

    Provider: `serpapi` (default) or `serper` — from arg, env MARKETING_GOOGLE_SEARCH_PROVIDER,
    or marketing settings `google_search_provider`.

    Key: dashboard `serpapi_key` or env SERPAPI_KEY (same field stores either vendor's key).
    """
    resolved_key = (api_key or os.getenv("SERPAPI_KEY") or os.getenv("SERPER_API_KEY") or "").strip()
    if not resolved_key:
        raise ValueError("Search API key not configured (serpapi_key in marketing settings or SERPAPI_KEY / SERPER_API_KEY env)")

    prov = _resolve_search_provider(provider)
    if prov == "serper":
        return _search_serper(query=query, num=num, api_key=resolved_key, gl=gl, hl=hl)
    return _search_serpapi(query=query, num=num, api_key=resolved_key, gl=gl, hl=hl)


def organic_results_to_lead_candidates(resp: dict[str, Any], *, query: str) -> list[dict[str, Any]]:
    """Map SerpAPI `organic_results` or Serper `organic` into preliminary lead dicts for sanitization."""
    organic = resp.get("organic_results") or resp.get("organic") or []
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
