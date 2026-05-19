"""Thread pools so long CrewAI jobs do not starve auth and other API I/O."""

from __future__ import annotations

import asyncio
import concurrent.futures
import os
from functools import partial
from typing import Callable, ParamSpec, TypeVar

P = ParamSpec("P")
T = TypeVar("T")

_CREW_WORKERS = max(1, int(os.getenv("CREW_ANALYSIS_WORKERS", "2")))
_API_IO_WORKERS = max(4, int(os.getenv("API_THREAD_POOL_WORKERS", "32")))

CREW_EXECUTOR = concurrent.futures.ThreadPoolExecutor(
    max_workers=_CREW_WORKERS,
    thread_name_prefix="crew-analysis",
)

_concurrency_configured = False


def configure_server_concurrency() -> None:
    """
    Use a larger default executor for short Supabase/auth work and a separate
    pool for multi-minute CrewAI kickoffs.
    """
    global _concurrency_configured
    if _concurrency_configured:
        return
    _concurrency_configured = True

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return

    loop.set_default_executor(
        concurrent.futures.ThreadPoolExecutor(
            max_workers=_API_IO_WORKERS,
            thread_name_prefix="api-io",
        )
    )


async def run_crew_blocking(
    func: Callable[P, T],
    /,
    *args: P.args,
    **kwargs: P.kwargs,
) -> T:
    """Run a blocking CrewAI / vision call without occupying the default I/O pool."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(CREW_EXECUTOR, partial(func, *args, **kwargs))
