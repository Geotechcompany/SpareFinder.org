"""
Windows asyncio tweaks — suppress noisy ConnectionResetError on client disconnect.

Browsers often close idle/aborted connections (React Strict Mode, polling, OPTIONS).
Python 3.12 ProactorEventLoop logs these in callbacks; requests still return 200 OK.
"""

from __future__ import annotations

import asyncio
import logging
import sys
from typing import Any

logger = logging.getLogger(__name__)

_policy_configured = False


def _is_benign_disconnect(exc: BaseException | None) -> bool:
    if exc is None:
        return False
    if isinstance(exc, ConnectionResetError):
        return True
    if isinstance(exc, ConnectionAbortedError):
        return True
    if isinstance(exc, OSError):
        winerror = getattr(exc, "winerror", None)
        if winerror in (10054, 10053):  # reset / aborted
            return True
        errno = getattr(exc, "errno", None)
        if errno in (10054, 10053, 104):  # ECONNRESET, ECONNABORTED, ECONNRESET on Linux
            return True
    return False


def _asyncio_exception_handler(loop: asyncio.AbstractEventLoop, context: dict[str, Any]) -> None:
    exc = context.get("exception")
    if _is_benign_disconnect(exc):
        if logger.isEnabledFor(logging.DEBUG):
            logger.debug("Client disconnected during asyncio cleanup: %s", exc)
        return
    loop.default_exception_handler(context)


def configure_asyncio_for_windows() -> None:
    """Install disconnect-safe handler on the active loop (call at import and on startup)."""
    global _policy_configured

    if sys.platform != "win32":
        return

    if not _policy_configured:
        _policy_configured = True
        # Selector loop avoids some Proactor shutdown races on dev Windows.
        if sys.version_info < (3, 14):
            try:
                asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
            except AttributeError:
                pass

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            return

    loop.set_exception_handler(_asyncio_exception_handler)
    logger.debug("Windows asyncio exception handler installed on %s", type(loop).__name__)
