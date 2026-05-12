"""Aggregate open/click stats for marketing_sends (used by dashboard + digest)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


def _count_exact(supabase: Any, *, table: str, filters: list[tuple[str, str, Any]]) -> int:
    q = supabase.table(table).select("id", count="exact")
    for col, op, val in filters:
        if op == "eq":
            q = q.eq(col, val)
        elif op == "gte":
            q = q.gte(col, val)
        elif op == "lt":
            q = q.lt(col, val)
        elif op == "gt":
            q = q.gt(col, val)
    try:
        r = q.execute()
        return int(getattr(r, "count", None) or 0)
    except Exception:
        return 0


def marketing_engagement_snapshot(supabase: Any) -> dict[str, Any]:
    """
    UTC-based counts for admin dashboard.
    Open/click columns require docs/sql/marketing_sends_tracking.sql applied.
    """
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    sends_today = _count_exact(
        supabase,
        table="marketing_sends",
        filters=[
            ("status", "eq", "sent"),
            ("sent_at", "gte", today_start.isoformat()),
        ],
    )

    sends_7d = _count_exact(
        supabase,
        table="marketing_sends",
        filters=[
            ("status", "eq", "sent"),
            ("sent_at", "gte", week_start.isoformat()),
        ],
    )

    # First open logged today (UTC)
    opens_logged_today = _count_exact(
        supabase,
        table="marketing_sends",
        filters=[
            ("status", "eq", "sent"),
            ("first_opened_at", "gte", today_start.isoformat()),
        ],
    )

    clicks_logged_today = _count_exact(
        supabase,
        table="marketing_sends",
        filters=[
            ("status", "eq", "sent"),
            ("first_clicked_at", "gte", today_start.isoformat()),
        ],
    )

    # Sends in last 7d that ever got at least one open (pixel load)
    sends_7d_with_open = _count_exact(
        supabase,
        table="marketing_sends",
        filters=[
            ("status", "eq", "sent"),
            ("sent_at", "gte", week_start.isoformat()),
            ("open_count", "gt", 0),
        ],
    )

    sends_7d_with_click = _count_exact(
        supabase,
        table="marketing_sends",
        filters=[
            ("status", "eq", "sent"),
            ("sent_at", "gte", week_start.isoformat()),
            ("click_count", "gt", 0),
        ],
    )

    open_rate_7d_pct = round(100.0 * sends_7d_with_open / sends_7d, 1) if sends_7d else 0.0
    click_rate_7d_pct = round(100.0 * sends_7d_with_click / sends_7d, 1) if sends_7d else 0.0

    return {
        "opens_logged_today": opens_logged_today,
        "clicks_logged_today": clicks_logged_today,
        "sends_last_7_days": sends_7d,
        "sends_last_7_days_with_open": sends_7d_with_open,
        "sends_last_7_days_with_click": sends_7d_with_click,
        "open_rate_last_7_days_pct": open_rate_7d_pct,
        "click_rate_last_7_days_pct": click_rate_7d_pct,
        "sends_today_for_engagement": sends_today,
    }
