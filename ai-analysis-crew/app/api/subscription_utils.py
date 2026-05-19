"""Helpers for choosing the canonical subscription row per user."""

from __future__ import annotations

from typing import Any

ACTIVE_STATUSES = frozenset({"active", "trialing"})


def subscription_status_rank(status: str | None) -> int:
    """Lower rank = preferred when multiple subscription rows exist."""
    s = (status or "inactive").lower().strip()
    order = {
        "active": 0,
        "trialing": 1,
        "past_due": 2,
        "canceled": 3,
        "inactive": 4,
        "incomplete": 5,
        "incomplete_expired": 6,
    }
    return order.get(s, 99)


def pick_best_subscription_row(rows: list[dict[str, Any]] | None) -> dict[str, Any] | None:
    """
    Prefer active/trialing rows; break ties by most recent period_end / updated_at.
    """
    if not rows:
        return None

    def sort_key(row: dict[str, Any]) -> tuple[int, str]:
        rank = subscription_status_rank(row.get("status"))
        period_end = str(row.get("current_period_end") or row.get("updated_at") or "")
        return (rank, period_end)

    return min(rows, key=sort_key)


def merge_subscription_by_user(
    rows: list[dict[str, Any]] | None,
) -> dict[str, dict[str, Any]]:
    """Map user_id -> best subscription fields for admin user lists."""
    out: dict[str, dict[str, Any]] = {}
    for row in rows or []:
        uid = row.get("user_id")
        if not uid:
            continue
        uid_s = str(uid)
        prev = out.get(uid_s)
        if prev is None or subscription_status_rank(row.get("status")) < subscription_status_rank(
            prev.get("status")
        ):
            out[uid_s] = row
    return out
