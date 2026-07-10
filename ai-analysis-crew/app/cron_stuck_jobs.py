"""Restart crew analysis jobs stuck in pending/processing (e.g. 5% at 'starting').

Runs on a croniter schedule in-process and via GET /api/cron/stuck-jobs for external crons.

Env:
  STUCK_JOBS_CRON              cron expression (default */5 * * * *)
  STUCK_JOBS_SCHEDULER_ENABLED 1/0 (default 1)
  STUCK_JOBS_MINUTES           idle threshold before restart (default 5)
  STUCK_JOBS_MAX_PROGRESS      max progress % to count as stuck (default 15)
  STUCK_JOBS_BATCH_LIMIT       max jobs per run (default 100)
  STUCK_JOBS_MAX_RESTARTS      restart attempts before failing job (default 3)
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from croniter import croniter

from .database_storage import update_crew_job_status

logger = logging.getLogger(__name__)

STUCK_STATUSES = ("pending", "processing")
RESTART_COUNT_KEY = "stuck_restart_count"
DEFAULT_CRON = "*/5 * * * *"
DEFAULT_STUCK_MINUTES = 5
DEFAULT_MAX_PROGRESS = 15
DEFAULT_BATCH_LIMIT = 100
DEFAULT_MAX_RESTARTS = 3

_JOB_SELECT = (
    "id,status,progress,updated_at,created_at,user_email,keywords,"
    "image_url,image_name,user_id,result_data"
)


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


def stuck_jobs_max_restarts() -> int:
    return max(1, _env_int("STUCK_JOBS_MAX_RESTARTS", DEFAULT_MAX_RESTARTS))


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


def _get_restart_count(result_data: Any) -> int:
    if not isinstance(result_data, dict):
        return 0
    try:
        return int(result_data.get(RESTART_COUNT_KEY) or 0)
    except (TypeError, ValueError):
        return 0


def _merge_restart_metadata(result_data: Any, restart_count: int) -> dict[str, Any]:
    base = dict(result_data) if isinstance(result_data, dict) else {}
    base[RESTART_COUNT_KEY] = restart_count
    base["last_stuck_restart_at"] = datetime.now(timezone.utc).isoformat()
    return base


def _validate_job_for_restart(row: dict[str, Any]) -> tuple[bool, str]:
    job_id = str(row.get("id") or "")
    if not job_id:
        return False, "missing_id"
    user_email = (row.get("user_email") or "").strip()
    if not user_email or "@" not in user_email:
        return False, "missing_user_email"
    keywords = (row.get("keywords") or "").strip()
    image_url = (row.get("image_url") or "").strip()
    has_image = bool(image_url) and not image_url.startswith("placeholder_url")
    if not keywords and not has_image:
        return False, "missing_keywords_and_image"
    return True, ""


def _reset_job_for_restart(
    supabase: Any,
    job_id: str,
    result_data: Any,
    restart_count: int,
) -> bool:
    try:
        supabase.table("crew_analysis_jobs").update(
            {
                "status": "processing",
                "current_stage": "starting",
                "progress": 5,
                "error_message": None,
                "result_data": _merge_restart_metadata(result_data, restart_count),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", job_id).execute()
        return True
    except Exception:
        logger.exception("stuck jobs cron: failed to reset job %s", job_id)
        return False


def _fail_job_max_restarts(job_id: str, progress: int, max_restarts: int) -> bool:
    return update_crew_job_status(
        job_id,
        "failed",
        current_stage="timed_out",
        progress=progress,
        error_message=(
            f"Job remained stuck after {max_restarts} automatic restart(s)"
        ),
    )


async def run_stuck_jobs_recovery(
    supabase: Any,
    *,
    stuck_minutes: int | None = None,
    max_progress: int | None = None,
    limit: int | None = None,
    max_restarts: int | None = None,
) -> dict[str, Any]:
    """
    Find crew_analysis_jobs stuck at low progress and restart them.

    Jobs with missing required data are skipped. Jobs exceeding STUCK_JOBS_MAX_RESTARTS
    are marked failed.
    """
    minutes = max(
        1,
        stuck_minutes
        if stuck_minutes is not None
        else _env_int("STUCK_JOBS_MINUTES", DEFAULT_STUCK_MINUTES),
    )
    max_prog = max(
        0,
        max_progress
        if max_progress is not None
        else _env_int("STUCK_JOBS_MAX_PROGRESS", DEFAULT_MAX_PROGRESS),
    )
    batch = max(
        1,
        min(
            limit if limit is not None else _env_int("STUCK_JOBS_BATCH_LIMIT", DEFAULT_BATCH_LIMIT),
            500,
        ),
    )
    max_rst = max(
        1,
        max_restarts if max_restarts is not None else stuck_jobs_max_restarts(),
    )

    cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    cutoff_iso = cutoff.isoformat()

    try:
        result = (
            supabase.table("crew_analysis_jobs")
            .select(_JOB_SELECT)
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
    restarted_ids: list[str] = []
    failed_ids: list[str] = []
    skipped: list[dict[str, str]] = []

    from .main import kickoff_crew_analysis_job

    for row in rows:
        if not _job_is_stuck(row, cutoff=cutoff, max_progress=max_prog):
            continue

        job_id = str(row.get("id") or "")
        if not job_id:
            continue

        ok, reason = _validate_job_for_restart(row)
        if not ok:
            logger.warning("stuck jobs cron: skip job %s (%s)", job_id, reason)
            skipped.append({"id": job_id, "reason": reason})
            continue

        try:
            progress_val = int(row.get("progress") or 0)
        except (TypeError, ValueError):
            progress_val = 0

        prior_count = _get_restart_count(row.get("result_data"))
        if prior_count >= max_rst:
            if _fail_job_max_restarts(job_id, progress_val, max_rst):
                failed_ids.append(job_id)
            else:
                skipped.append({"id": job_id, "reason": "fail_update_failed"})
            continue

        new_count = prior_count + 1
        if not _reset_job_for_restart(supabase, job_id, row.get("result_data"), new_count):
            skipped.append({"id": job_id, "reason": "reset_failed"})
            continue

        await kickoff_crew_analysis_job(
            job_id,
            row.get("user_email"),
            keywords=row.get("keywords"),
            image_url=row.get("image_url"),
            image_name=row.get("image_name"),
            user_id=row.get("user_id"),
            cancel_existing=True,
            reset_status=False,
        )
        restarted_ids.append(job_id)

    summary = {
        "ok": True,
        "stuck_minutes": minutes,
        "max_progress": max_prog,
        "max_restarts": max_rst,
        "candidates": len(rows),
        "restarted": len(restarted_ids),
        "failed_max_restarts": len(failed_ids),
        "skipped": len(skipped),
        "restarted_ids": restarted_ids,
        "failed_ids": failed_ids,
        "skipped_jobs": skipped,
    }
    if restarted_ids:
        logger.info(
            "stuck jobs cron restarted %s job(s) (>%s min idle, progress<=%s)",
            len(restarted_ids),
            minutes,
            max_prog,
        )
    if failed_ids:
        logger.warning(
            "stuck jobs cron failed %s job(s) after max restarts (%s)",
            len(failed_ids),
            max_rst,
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
            summary = await run_stuck_jobs_recovery(supabase)
            if not summary.get("ok"):
                logger.warning("stuck jobs cron: %s", summary.get("error") or summary)
        except Exception:
            logger.exception("stuck jobs croniter loop crashed")


def start_stuck_jobs_scheduler() -> None:
    asyncio.create_task(_stuck_jobs_scheduler_loop())
