"""SerpAPI Google search for marketing lead discovery."""

from __future__ import annotations

import logging
import os
import re
from typing import Any
from urllib.parse import unquote, urlparse

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


def _env_truthy(name: str) -> bool:
    return (os.getenv(name) or "").strip().lower() in ("1", "true", "yes", "on")


def _email_scrape_from_pages_enabled() -> bool:
    """Whether to HTTP-fetch result/contact pages for regex email extraction (default: yes)."""
    v = (os.getenv("MARKETING_SERP_EMAIL_SCRAPE") or "").strip().lower()
    if v in ("0", "false", "no", "off"):
        return False
    return True


def _host_from_url(url: str) -> str:
    try:
        h = (urlparse(url).hostname or "").lower()
        return h[4:] if h.startswith("www.") else h
    except Exception:
        return ""


def _mailto_from_link(link: str) -> str | None:
    if not link or "mailto:" not in link.lower():
        return None
    m = re.search(
        r"mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})",
        unquote(link),
        flags=re.I,
    )
    return m.group(1).strip().lower() if m else None


_SKIP_EMAIL_LOCALS = frozenset({"noreply", "no-reply", "donotreply", "mailer-daemon", "postmaster"})
_BAD_EMAIL_DOMAINS = frozenset({"example.com", "test.com", "domain.com", "email.com", "yoursite.com", "sentry.io"})


def _pick_best_email(emails: list[str], host_hint: str) -> str | None:
    """Prefer addresses on the same host as the result URL; skip obvious system locals."""
    if not emails:
        return None
    host_hint = (host_hint or "").lower()
    if host_hint.startswith("www."):
        host_hint = host_hint[4:]
    scored: list[tuple[int, str]] = []
    for raw in emails:
        el = (raw or "").strip().lower()
        if "@" not in el:
            continue
        local, _, domain = el.partition("@")
        domain = domain[4:] if domain.startswith("www.") else domain
        if domain in _BAD_EMAIL_DOMAINS:
            continue
        if local in _SKIP_EMAIL_LOCALS:
            continue
        score = 0
        if host_hint and (domain == host_hint or domain.endswith("." + host_hint)):
            score += 10
        scored.append((score, el))
    if scored:
        scored.sort(key=lambda x: -x[0])
        return scored[0][1]
    return emails[0].strip().lower() if emails else None


def _collect_sitelink_strings(obj: Any, sink: list[str]) -> None:
    if isinstance(obj, dict):
        for k in ("title", "snippet", "link", "text"):
            v = obj.get(k)
            if isinstance(v, str) and v.strip():
                sink.append(v.strip())
        for v in obj.values():
            if isinstance(v, (dict, list)):
                _collect_sitelink_strings(v, sink)
    elif isinstance(obj, list):
        for x in obj:
            _collect_sitelink_strings(x, sink)


def _gather_organic_text(item: dict[str, Any]) -> str:
    parts: list[str] = []
    for key in ("title", "snippet", "description", "date"):
        v = item.get(key)
        if isinstance(v, str) and v.strip():
            parts.append(v.strip())
    sh = item.get("snippet_highlighted_words")
    if isinstance(sh, list):
        parts.extend(str(x).strip() for x in sh if str(x).strip())
    link = str(item.get("link") or "").strip()
    if link:
        parts.append(link)
    mt = _mailto_from_link(link)
    if mt:
        parts.append(mt)
    _collect_sitelink_strings(item.get("sitelinks"), parts)
    attrs = item.get("attributes")
    if isinstance(attrs, dict):
        for v in attrs.values():
            if isinstance(v, str) and v.strip():
                parts.append(v.strip())
    return "\n".join(parts)


_SCRAPE_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def _contact_fallback_urls(seed_url: str) -> list[str]:
    """Same-origin paths often used for mail / forms (tried only when email scrape is enabled)."""
    try:
        p = urlparse(seed_url)
        if p.scheme not in ("http", "https") or not p.netloc:
            return []
        root = f"{p.scheme}://{p.netloc}".rstrip("/")
        seed_norm = seed_url.split("#", 1)[0].rstrip("/")
        out: list[str] = []
        for path in ("/contact", "/contact-us", "/about", "/about-us"):
            u = f"{root}{path}"
            if u.rstrip("/") == seed_norm.rstrip("/") or u in out:
                continue
            out.append(u)
        return out
    except Exception:
        return []


def _email_domain_on_host(email: str, host: str) -> bool:
    if not host or "@" not in email:
        return False
    dom = email.rsplit("@", 1)[-1].lower()
    if dom.startswith("www."):
        dom = dom[4:]
    h = host.lower()
    if h.startswith("www."):
        h = h[4:]
    return dom == h or dom.endswith("." + h)


def _scrape_emails_chain(seed_url: str, host: str) -> str | None:
    """Fetch ranking URL then a few same-site contact paths; stop early on a host-matched address."""
    urls = [seed_url]
    for u in _contact_fallback_urls(seed_url):
        if u not in urls:
            urls.append(u)
        if len(urls) >= 4:
            break
    accumulated: list[str] = []
    for u in urls:
        accumulated.extend(_try_emails_from_result_url(u))
        best = _pick_best_email(accumulated, host)
        if best and _email_domain_on_host(best, host):
            return best
    return _pick_best_email(accumulated, host)


def _try_emails_from_result_url(url: str) -> list[str]:
    """
    Fetch one URL and regex-scan HTML for addresses (used when page scraping is enabled).
    Respect robots/terms of target sites. Disable all scraping with MARKETING_SERP_EMAIL_SCRAPE=0.
    """
    if not url.startswith(("http://", "https://")):
        return []
    try:
        with httpx.Client(
            timeout=httpx.Timeout(6.0, connect=4.0),
            follow_redirects=True,
            headers={
                "User-Agent": _SCRAPE_UA,
                "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            },
        ) as client:
            r = client.get(url)
            if r.status_code >= 400:
                return []
            ct = (r.headers.get("content-type") or "").lower()
            if "html" not in ct and "xhtml" not in ct:
                return []
            return _extract_emails((r.text or "")[:400_000])
    except Exception as e:
        logger.debug("MARKETING_SERP_EMAIL_SCRAPE skip %s: %s", url[:96], e)
        return []


def _resolve_search_provider(explicit: str | None) -> str:
    p = (explicit or os.getenv("MARKETING_GOOGLE_SEARCH_PROVIDER") or "serper").strip().lower()
    if p in ("serpapi", "serpapi.com"):
        return "serpapi"
    return "serper"


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

    Provider: `serper` (default) or `serpapi` — from arg, env MARKETING_GOOGLE_SEARCH_PROVIDER,
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
    """
    Map SerpAPI `organic_results` or Serper `organic` into preliminary lead dicts.

    Google titles/snippets usually do **not** contain email addresses; we still regex-scan
    all available SERP text (including sitelinks / mailto). Optional env
    By default fetches each result URL plus common ``/contact``-style paths on the same host and scans HTML
    (slower; use responsibly). Set ``MARKETING_SERP_EMAIL_SCRAPE=0`` to disable.
    """
    organic = resp.get("organic_results") or resp.get("organic") or []
    scrape_pages = _email_scrape_from_pages_enabled()
    candidates: list[dict[str, Any]] = []
    for item in organic:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        link = str(item.get("link") or "").strip()
        snippet = str(item.get("snippet") or "").strip()
        host = _host_from_url(link)
        combined = _gather_organic_text(item)
        emails = _extract_emails(combined)
        email = _pick_best_email(emails, host)
        if not email and scrape_pages and link:
            email = _scrape_emails_chain(link, host)
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
