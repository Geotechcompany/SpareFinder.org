"""Rotate and de-duplicate Google discovery queries across manual runs and crons."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from .marketing_crew import generate_serp_discovery_queries

logger = logging.getLogger(__name__)

RECENT_QUERIES_CAP = 50


def normalize_serp_query(query: str) -> str:
    return " ".join(str(query or "").strip().lower().split())


def dedupe_queries(queries: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for raw in queries:
        s = str(raw).strip()
        if not s:
            continue
        key = normalize_serp_query(s)
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
    return out


def select_rotated_queries(
    templates: list[str],
    max_queries: int,
    offset: int,
) -> tuple[list[str], int]:
    """Round-robin pick up to max_queries unique templates; returns (queries, next_offset)."""
    clean = dedupe_queries(templates)
    if not clean:
        return [], 0

    n = len(clean)
    max_q = max(1, min(int(max_queries), 10))
    start = int(offset) % n
    picked: list[str] = []
    idx = start
    while len(picked) < max_q:
        picked.append(clean[idx % n])
        idx += 1
    next_offset = idx % n
    return picked[:max_q], next_offset


def _recent_norm_set(settings_val: dict[str, Any]) -> set[str]:
    recent = settings_val.get("serp_queries_recent") or []
    if not isinstance(recent, list):
        return set()
    return {normalize_serp_query(q) for q in recent if str(q).strip()}


def _select_queries_avoiding_recent(
    templates: list[str],
    max_queries: int,
    offset: int,
    recent_norm: set[str],
) -> tuple[list[str], int]:
    clean = dedupe_queries(templates)
    if not clean:
        return [], int(offset)

    n = len(clean)
    max_q = max(1, min(int(max_queries), 10))
    picked: list[str] = []
    idx = int(offset) % n
    scanned = 0

    while len(picked) < max_q and scanned < n * 3:
        q = clean[idx % n]
        key = normalize_serp_query(q)
        if key not in recent_norm and q not in picked:
            picked.append(q)
        idx += 1
        scanned += 1

    if len(picked) < max_q:
        rotated, next_off = select_rotated_queries(clean, max_q, offset)
        for q in rotated:
            if q not in picked:
                picked.append(q)
            if len(picked) >= max_q:
                break
        return picked[:max_q], next_off

    return picked[:max_q], idx % n


def prepare_discovery_queries(
    *,
    templates: list[str],
    max_queries: int,
    settings_val: dict[str, Any],
    prefer_ai_fresh: bool,
) -> tuple[list[str], int, bool]:
    """
    Build the query list for one discovery run.
    Cron runs use AI-fresh queries when possible; manual runs rotate and skip recent repeats.
    """
    templates = dedupe_queries([str(t).strip() for t in templates if str(t).strip()])
    max_q = max(1, min(int(max_queries), 10))
    offset = int(settings_val.get("serp_query_rotation_offset") or 0)
    recent_norm = _recent_norm_set(settings_val)

    exclude_for_ai = dedupe_queries(
        templates + [str(q).strip() for q in (settings_val.get("serp_queries_recent") or []) if str(q).strip()]
    )

    if prefer_ai_fresh:
        try:
            cc = str(settings_val.get("serp_target_country_code") or "").strip().lower()
            cn = cc.upper() if cc else "Global"
            ai_queries = generate_serp_discovery_queries(
                country_code=cc,
                country_name=cn,
                count=max_q,
                extra_context=(
                    "SpareFinder B2B outbound; industrial spare parts, MRO, procurement. "
                    f"Discovery run at {datetime.now(timezone.utc).isoformat()} — use new angles."
                ),
                exclude_queries=exclude_for_ai,
            )
            fresh = [
                q
                for q in dedupe_queries(ai_queries)
                if normalize_serp_query(q) not in recent_norm
            ][:max_q]
            if len(fresh) >= max_q:
                return fresh[:max_q], offset, True
            if fresh:
                rotated, next_off = _select_queries_avoiding_recent(
                    templates,
                    max_q - len(fresh),
                    offset,
                    recent_norm,
                )
                combined = dedupe_queries(fresh + rotated)
                if combined:
                    return combined[:max_q], next_off, True
        except Exception:
            logger.warning("prepare_discovery_queries: AI fresh generation failed", exc_info=True)

    if not templates:
        return [], offset, False

    picked, next_off = _select_queries_avoiding_recent(templates, max_q, offset, recent_norm)
    return picked, next_off, False


def record_discovery_queries_run(
    supabase: Any,
    settings_val: dict[str, Any],
    *,
    queries_used: list[str],
    next_rotation_offset: int,
) -> None:
    """Persist rotation cursor and recently-run queries so crons do not repeat the same SERPs."""
    recent = [
        str(q).strip()
        for q in (settings_val.get("serp_queries_recent") or [])
        if str(q).strip()
    ]
    seen = {normalize_serp_query(q) for q in recent}
    for q in queries_used:
        s = str(q).strip()
        if not s:
            continue
        key = normalize_serp_query(s)
        if key in seen:
            continue
        seen.add(key)
        recent.append(s)
    settings_val["serp_queries_recent"] = recent[-RECENT_QUERIES_CAP:]
    settings_val["serp_query_rotation_offset"] = int(next_rotation_offset) % max(1, len(dedupe_queries(settings_val.get("serp_query_templates") or [])) or 1)

    try:
        supabase.table("marketing_settings").update(
            {
                "setting_value": settings_val,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("setting_key", "defaults").execute()
    except Exception:
        logger.warning("record_discovery_queries_run: failed to persist settings", exc_info=True)
