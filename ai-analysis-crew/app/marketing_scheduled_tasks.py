"""In-process marketing cron loops (single API worker).

Intervals and batch sizes come from **Admin → Email campaigns → Find on Google** (stored in
``marketing_settings.defaults``), unless the corresponding ``MARKETING_SCHEDULED_*`` **environment
variable is set** (non-empty), in which case the env value wins for that field.

When ``scheduled_*_interval_sec`` is 0 and env is unset, each loop only wakes every
``MARKETING_SCHEDULED_IDLE_POLL_SEC`` (default 60s) to re-read settings — so enabling automation in
admin takes effect within about one minute without restarting the API.

With multiple replicas, use external HTTP crons instead so each job runs once.
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from typing import Any

from .marketing_outbound_defaults import get_marketing_settings_row

logger = logging.getLogger(__name__)

IDLE_POLL_SEC = max(15, min(int((os.getenv("MARKETING_SCHEDULED_IDLE_POLL_SEC") or "60").strip() or "60"), 600))


def _env_int(name: str, default: int = 0) -> int:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_override_int(name: str) -> int | None:
    """If env is set (including ``0``), return its int; if unset/blank, return None (use DB)."""
    raw = (os.getenv(name) or "").strip()
    if raw == "":
        return None
    try:
        return int(raw)
    except ValueError:
        return None


@dataclass(frozen=True)
class DiscoverSchedule:
    interval_sec: int
    max_queries: int
    initial_delay_sec: int


@dataclass(frozen=True)
class SendSchedule:
    interval_sec: int
    max_batch: int
    initial_delay_sec: int


def _resolve_discover_schedule(supabase: Any) -> DiscoverSchedule:
    row = get_marketing_settings_row(supabase)
    val = row.get("setting_value") or {}

    env_iv = _env_override_int("MARKETING_SCHEDULED_DISCOVER_INTERVAL_SEC")
    interval = env_iv if env_iv is not None else int(val.get("scheduled_discover_interval_sec") or 0)
    interval = max(0, min(interval, 604800))

    env_mq = _env_override_int("MARKETING_SCHEDULED_DISCOVER_MAX_QUERIES")
    mq_raw = env_mq if env_mq is not None else int(val.get("scheduled_discover_max_queries") or 3)
    max_q = max(1, min(mq_raw, 10))

    initial = max(0, min(_env_int("MARKETING_SCHEDULED_DISCOVER_INITIAL_DELAY_SEC", 120), interval or 86400))

    return DiscoverSchedule(interval_sec=interval, max_queries=max_q, initial_delay_sec=initial)


def _resolve_send_schedule(supabase: Any) -> SendSchedule:
    row = get_marketing_settings_row(supabase)
    val = row.get("setting_value") or {}

    env_iv = _env_override_int("MARKETING_SCHEDULED_SEND_INTERVAL_SEC")
    interval = env_iv if env_iv is not None else int(val.get("scheduled_send_interval_sec") or 0)
    interval = max(0, min(interval, 604800))

    env_b = _env_override_int("MARKETING_SCHEDULED_SEND_BATCH")
    batch_raw = env_b if env_b is not None else int(val.get("scheduled_send_batch") or 20)
    batch = max(1, min(batch_raw, 200))

    initial = max(0, min(_env_int("MARKETING_SCHEDULED_SEND_INITIAL_DELAY_SEC", 30), interval or 3600))

    return SendSchedule(interval_sec=interval, max_batch=batch, initial_delay_sec=initial)


async def _loop_discover() -> None:
    from .api.routes_marketing import run_marketing_discover_cron_job
    from .api.supabase_admin import get_supabase_admin

    first_enabled_iteration = True
    logged_disabled = False

    while True:
        try:
            supabase = get_supabase_admin()
            cfg = await asyncio.to_thread(_resolve_discover_schedule, supabase)
        except Exception:
            logger.exception("marketing scheduled discover: failed to read settings")
            await asyncio.sleep(IDLE_POLL_SEC)
            continue

        if cfg.interval_sec <= 0:
            if not logged_disabled:
                logger.info(
                    "Marketing in-process discovery idle (interval 0). Enable in admin or set "
                    "MARKETING_SCHEDULED_DISCOVER_INTERVAL_SEC; rechecking every %ss.",
                    IDLE_POLL_SEC,
                )
                logged_disabled = True
            first_enabled_iteration = True
            await asyncio.sleep(IDLE_POLL_SEC)
            continue

        logged_disabled = False

        if first_enabled_iteration:
            logger.info(
                "Marketing in-process discovery running every %ss (max_queries=%s, initial_delay=%ss)",
                cfg.interval_sec,
                cfg.max_queries,
                cfg.initial_delay_sec,
            )
            if cfg.initial_delay_sec > 0:
                await asyncio.sleep(min(cfg.initial_delay_sec, cfg.interval_sec))
            first_enabled_iteration = False

        try:
            supabase = get_supabase_admin()
            result = await asyncio.to_thread(run_marketing_discover_cron_job, supabase, cfg.max_queries)
            if not result.get("ok"):
                logger.warning("marketing scheduled discover: %s", result.get("error") or result)
            else:
                logger.info(
                    "marketing scheduled discover ok: candidates=%s error_lines=%s",
                    result.get("candidates_upserted"),
                    len(result.get("errors") or []),
                )
        except Exception:
            logger.exception("marketing scheduled discover crashed")

        await asyncio.sleep(cfg.interval_sec)


async def _loop_send() -> None:
    from .api.supabase_admin import get_supabase_admin
    from .marketing_pipeline import run_marketing_send_cron

    first_enabled_iteration = True
    logged_disabled = False

    while True:
        try:
            supabase = get_supabase_admin()
            cfg = await asyncio.to_thread(_resolve_send_schedule, supabase)
        except Exception:
            logger.exception("marketing scheduled send: failed to read settings")
            await asyncio.sleep(IDLE_POLL_SEC)
            continue

        if cfg.interval_sec <= 0:
            if not logged_disabled:
                logger.info(
                    "Marketing in-process send idle (interval 0). Enable in admin or set "
                    "MARKETING_SCHEDULED_SEND_INTERVAL_SEC; rechecking every %ss.",
                    IDLE_POLL_SEC,
                )
                logged_disabled = True
            first_enabled_iteration = True
            await asyncio.sleep(IDLE_POLL_SEC)
            continue

        logged_disabled = False

        if first_enabled_iteration:
            logger.info(
                "Marketing in-process send running every %ss (max_batch=%s, initial_delay=%ss)",
                cfg.interval_sec,
                cfg.max_batch,
                cfg.initial_delay_sec,
            )
            if cfg.initial_delay_sec > 0:
                await asyncio.sleep(min(cfg.initial_delay_sec, cfg.interval_sec))
            first_enabled_iteration = False

        try:
            supabase = get_supabase_admin()
            result = await asyncio.to_thread(run_marketing_send_cron, supabase, max_batch=cfg.max_batch)
            if result.get("ok") is False:
                logger.warning("marketing scheduled send: %s", result.get("error") or result)
            else:
                logger.info(
                    "marketing scheduled send ok: sent=%s failed=%s skipped=%s",
                    result.get("sent"),
                    result.get("failed"),
                    result.get("skipped"),
                )
        except Exception:
            logger.exception("marketing scheduled send crashed")

        await asyncio.sleep(cfg.interval_sec)


@dataclass(frozen=True)
class SanitizeSchedule:
    interval_sec: int
    batch_size: int
    initial_delay_sec: int


def _resolve_sanitize_schedule(supabase: Any) -> SanitizeSchedule:
    row = get_marketing_settings_row(supabase)
    val = row.get("setting_value") or {}

    env_iv = _env_override_int("MARKETING_SCHEDULED_SANITIZE_INTERVAL_SEC")
    interval = env_iv if env_iv is not None else int(val.get("scheduled_sanitize_interval_sec") or 300)
    interval = max(0, min(interval, 604800))

    env_b = _env_override_int("MARKETING_SCHEDULED_SANITIZE_BATCH")
    batch_raw = env_b if env_b is not None else int(val.get("sanitize_review_batch") or 100)
    batch = max(1, min(batch_raw, 500))

    initial = max(0, min(_env_int("MARKETING_SCHEDULED_SANITIZE_INITIAL_DELAY_SEC", 45), interval or 3600))

    return SanitizeSchedule(interval_sec=interval, batch_size=batch, initial_delay_sec=initial)


async def _loop_sanitize() -> None:
    from .api.routes_marketing import run_marketing_sanitize_cron_job
    from .api.supabase_admin import get_supabase_admin

    first_enabled_iteration = True
    logged_disabled = False

    while True:
        try:
            supabase = get_supabase_admin()
            cfg = await asyncio.to_thread(_resolve_sanitize_schedule, supabase)
        except Exception:
            logger.exception("marketing scheduled sanitize: failed to read settings")
            await asyncio.sleep(IDLE_POLL_SEC)
            continue

        if cfg.interval_sec <= 0:
            if not logged_disabled:
                logger.info(
                    "Marketing in-process sanitize idle (interval 0). Set scheduled_sanitize_interval_sec "
                    "in admin or MARKETING_SCHEDULED_SANITIZE_INTERVAL_SEC; rechecking every %ss.",
                    IDLE_POLL_SEC,
                )
                logged_disabled = True
            first_enabled_iteration = True
            await asyncio.sleep(IDLE_POLL_SEC)
            continue

        logged_disabled = False

        if first_enabled_iteration:
            logger.info(
                "Marketing in-process sanitize running every %ss (batch_size=%s, initial_delay=%ss)",
                cfg.interval_sec,
                cfg.batch_size,
                cfg.initial_delay_sec,
            )
            if cfg.initial_delay_sec > 0:
                await asyncio.sleep(min(cfg.initial_delay_sec, cfg.interval_sec))
            first_enabled_iteration = False

        try:
            supabase = get_supabase_admin()
            result = await asyncio.to_thread(
                run_marketing_sanitize_cron_job,
                supabase,
                max_total=max(cfg.batch_size * 5, 500),
            )
            if result.get("ok") is False:
                logger.warning("marketing scheduled sanitize: %s", result.get("error") or result)
            elif int(result.get("processed") or 0) > 0:
                logger.info(
                    "marketing scheduled sanitize ok: processed=%s accepted=%s rejected=%s still_review=%s",
                    result.get("processed"),
                    result.get("accepted"),
                    result.get("rejected"),
                    result.get("still_review"),
                )
        except Exception:
            logger.exception("marketing scheduled sanitize crashed")

        await asyncio.sleep(cfg.interval_sec)


def start_marketing_scheduled_tasks() -> None:
    asyncio.create_task(_loop_discover())
    asyncio.create_task(_loop_send())
    asyncio.create_task(_loop_sanitize())
    logger.info(
        "Marketing in-process scheduler started (idle until admin/env sets intervals; idle poll %ss).",
        IDLE_POLL_SEC,
    )
