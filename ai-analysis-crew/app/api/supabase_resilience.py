"""Retries and classification for transient Supabase / httpx failures."""

from __future__ import annotations

import logging
import time
from typing import Callable, TypeVar

import httpx

logger = logging.getLogger(__name__)

T = TypeVar("T")

_TRANSIENT_MARKERS = (
    "server disconnected",
    "remoteprotocolerror",
    "connectionterminated",
    "connection reset",
    "connection refused",
    "broken pipe",
    "read timeout",
    "write timeout",
    "connect timeout",
    "temporarily unavailable",
    "502",
    "503",
    "504",
    "cloudflare",
    "json could not be generated",
)


def is_transient_http_error(exc: BaseException) -> bool:
    """True when the failure is likely temporary (network / Supabase / Cloudflare)."""
    if isinstance(
        exc,
        (
            httpx.RemoteProtocolError,
            httpx.ConnectError,
            httpx.ReadTimeout,
            httpx.WriteTimeout,
            httpx.ConnectTimeout,
            httpx.NetworkError,
            ConnectionError,
            TimeoutError,
        ),
    ):
        return True
    text = str(exc).lower()
    return any(marker in text for marker in _TRANSIENT_MARKERS)


def run_supabase(
    fn: Callable[[], T],
    *,
    max_attempts: int = 3,
    base_delay_sec: float = 0.35,
) -> T:
    """Run a sync Supabase call with short exponential backoff on transient errors."""
    last_exc: BaseException | None = None
    for attempt in range(max_attempts):
        try:
            return fn()
        except Exception as exc:
            last_exc = exc
            if not is_transient_http_error(exc) or attempt >= max_attempts - 1:
                raise
            delay = base_delay_sec * (2**attempt)
            if attempt == max_attempts - 2:
                try:
                    from .supabase_admin import reset_supabase_admin

                    reset_supabase_admin()
                except Exception:
                    pass
            logger.warning(
                "Transient Supabase error (attempt %s/%s), retrying in %.2fs: %s",
                attempt + 1,
                max_attempts,
                delay,
                exc,
            )
            time.sleep(delay)
    if last_exc:
        raise last_exc
    raise RuntimeError("run_supabase failed without exception")
