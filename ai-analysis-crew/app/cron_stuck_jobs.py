"""Recover crew analysis jobs stuck in pending/processing (e.g. 5% at 'starting').

Runs on a croniter schedule in-process and via GET /api/cron/stuck-jobs for external crons.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from croniter import croniter

from .database_storage import complete_crew_job, update_crew_job_status

logger = logging.getLogger(__name__)

STUCK_STATUSES = ("pending", "processing")
DEFAULT_CRON = "*/5 * * * *"
DEFAULT_STUCK_MINUTES = 5
DEFAULT_MAX_PROGRESS = 15
DEFAULT_BATCH_LIMIT = 100


def _env_bool(name: str, default: bool = True) -> bool:
    raw = (os.getenv(name) or "").strip().lower()
    if not raw:
        return default
    return raw not in ("0", "false", "no", "off")


def _env_int(name: str, default: int) -> int:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def stuck_jobs_cron_expression() -> str:
    return (os.getenv("STUCK_JOBS_CRON") or DEFAULT_CRON).strip() or DEFAULT_CRON


def stuck_jobs_scheduler_enabled() -> bool:
    return _env_bool("STUCK_JOBS_SCHEDULER_ENABLED", True)


def _parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except (TypeError, ValueError):
        return None


def _job_is_stuck(row: dict[str, Any], *, cutoff: datetime, max_progress: int) -> bool:
    status = (row.get("status") or "").lower().strip()
    if status not in STUCK_STATUSES:
        return False
    progress = row.get("progress")
    try:
        progress_val = int(progress) if progress is not None else 0
    except (TypeError, ValueError):
        progress_val = 0
    if progress_val > max_progress:
        return False
    updated = _parse_ts(row.get("updated_at")) or _parse_ts(row.get("created_at"))
    if not updated:
        return False
    return updated < cutoff


def _close_stuck_job(job_id: str, *, progress: int, action: str) -> bool:
    if action == "complete":
        return complete_crew_job(
            job_id,
            {
                "auto_closed": True,
                "reason": "stuck_job_recovery",
                "message": "Analysis did not finish in time and was closed automatically.",
            },
        )
    return update_crew_job_status(
        job_id,
        "failed",
        current_stage="timed_out",
        progress=progress,
        error_message="Job timed out - processing took too long",
    )


def run_stuck_jobs_cron(
    supabase: Any,
    *,
    stuck_minutes: int | None = None,
    max_progress: int | None = None,
    limit: int | None = None,
    action: str | None = None,
) -> dict[str, Any]:
    """
    Find crew_analysis_jobs stuck at low progress and close them (failed by default).

    Matches History UI behaviour: pending/processing with no progress for STUCK_JOBS_MINUTES.
    """
    minutes = max(1, stuck_minutes if stuck_minutes is not None else _env_int("STUCK_JOBS_MINUTES", DEFAULT_STUCK_MINUTES))
    max_prog = max(
        0,
        max_progress if max_progress is not None else _env_int("STUCK_JOBS_MAX_PROGRESS", DEFAULT_MAX_PROGRESS),
    )
    batch = max(1, min(limit if limit is not None else _env_int("STUCK_JOBS_BATCH_LIMIT", DEFAULT_BATCH_LIMIT), 500))
    resolution = (action or os.getenv("STUCK_JOBS_ACTION") or "fail").strip().lower()
    if resolution not in ("fail", "complete"):
        resolution = "fail"

    cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    cutoff_iso = cutoff.isoformat()

    try:
        result = (
            supabase.table("crew_analysis_jobs")
            .select("id,status,progress,updated_at,created_at")
            .in_("status", list(STUCK_STATUSES))
            .lte("progress", max_prog)
            .lt("updated_at", cutoff_iso)
            .order("updated_at")
            .limit(batch)
            .execute()
        )
    except Exception as e:
        logger.exception("stuck jobs cron: query failed")
        return {"ok": False, "error": str(e)}

    rows = result.data or []
    closed_ids: list[str] = []
    for row in rows:
        if not _job_is_stuck(row, cutoff=cutoff, max_progress=max_prog):
            continue
        job_id = str(row.get("id") or "")
        if not job_id:
            continue
        try:
            progress_val = int(row.get("progress") or 0)
        except (TypeError, ValueError):
            progress_val = 0
        if _close_stuck_job(job_id, progress=progress_val, action=resolution):
            closed_ids.append(job_id)

    summary = {
        "ok": True,
        "action": resolution,
        "stuck_minutes": minutes,
        "max_progress": max_prog,
        "candidates": len(rows),
        "closed": len(closed_ids),
        "job_ids": closed_ids,
    }
    if closed_ids:
        logger.info(
            "stuck jobs cron closed %s job(s) as %s (>%s min, progress<=%s)",
            len(closed_ids),
            resolution,
            minutes,
            max_prog,
        )
    return summary


async def _stuck_jobs_scheduler_loop() -> None:
    if not stuck_jobs_scheduler_enabled():
        logger.info("Stuck-jobs croniter scheduler disabled (STUCK_JOBS_SCHEDULER_ENABLED=0)")
        return

    cron_expr = stuck_jobs_cron_expression()
    try:
        croniter(cron_expr, datetime.now(timezone.utc))
    except Exception as e:
        logger.error("Invalid STUCK_JOBS_CRON %r: %s — scheduler not started", cron_expr, e)
        return

    from .api.supabase_admin import get_supabase_admin

    cron = croniter(cron_expr, datetime.now(timezone.utc))
    logger.info("Stuck-jobs croniter scheduler started (%s)", cron_expr)

    while True:
        next_run = cron.get_next(datetime)
        if next_run.tzinfo is None:
            next_run = next_run.replace(tzinfo=timezone.utc)
        sleep_sec = max(1.0, (next_run - datetime.now(timezone.utc)).total_seconds())
        await asyncio.sleep(sleep_sec)
        try:
            supabase = get_supabase_admin()
            summary = await asyncio.to_thread(run_stuck_jobs_cron, supabase)
            if not summary.get("ok"):
                logger.warning("stuck jobs cron: %s", summary.get("error") or summary)
        except Exception:
            logger.exception("stuck jobs croniter loop crashed")


def start_stuck_jobs_scheduler() -> None:
    asyncio.create_task(_stuck_jobs_scheduler_loop())
