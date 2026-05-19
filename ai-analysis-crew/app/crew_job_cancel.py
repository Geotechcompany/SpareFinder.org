"""Track and cancel in-flight crew analysis jobs (e.g. when user deletes from History)."""

from __future__ import annotations

import asyncio
import logging
import threading
from typing import Dict, Optional

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_cancelled_ids: set[str] = set()
_running_tasks: Dict[str, asyncio.Task] = {}


class CrewJobCancelledError(Exception):
    """Raised when a crew job was deleted or explicitly cancelled."""


def register_running_task(job_id: str, task: asyncio.Task) -> None:
    with _lock:
        _running_tasks[job_id] = task
        _cancelled_ids.discard(job_id)


def unregister_running_task(job_id: str, task: Optional[asyncio.Task] = None) -> None:
    with _lock:
        if task is None or _running_tasks.get(job_id) is task:
            _running_tasks.pop(job_id, None)


def request_cancel_crew_job(job_id: str) -> None:
    """Signal cancellation and cancel the asyncio task if still running."""
    with _lock:
        _cancelled_ids.add(job_id)
        task = _running_tasks.get(job_id)

    if task and not task.done():
        task.cancel()
        logger.info("Cancelled in-flight asyncio task for crew job %s", job_id[:8])
    else:
        logger.info("Cancellation requested for crew job %s (no active task)", job_id[:8])


def is_crew_job_cancelled(job_id: str) -> bool:
    with _lock:
        return job_id in _cancelled_ids


def clear_cancel_flag(job_id: str) -> None:
    with _lock:
        _cancelled_ids.discard(job_id)


def ensure_not_cancelled(job_id: str) -> None:
    """Cooperative check for worker threads (crew kickoff loop)."""
    if is_crew_job_cancelled(job_id):
        raise CrewJobCancelledError(f"Job {job_id} was cancelled")
