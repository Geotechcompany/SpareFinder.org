from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from .supabase_admin import get_supabase_admin


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_count(res: Any) -> Optional[int]:
    for attr in ("count",):
        v = getattr(res, attr, None)
        if isinstance(v, int):
            return v
    if isinstance(getattr(res, "data", None), dict):
        v = res.data.get("count")
        if isinstance(v, int):
            return v
    return None


def supabase_count(*, table: str, filters: list[tuple[str, str, Any]]) -> int:
    """
    Best-effort count helper that works across supabase-py versions.
    Falls back to fetching ids if count isn't returned.
    """
    supabase = get_supabase_admin()
    q = supabase.table(table).select("id", count="exact")  # type: ignore[arg-type]
    for col, op, val in filters:
        if op == "eq":
            q = q.eq(col, val)
        elif op == "gte":
            q = q.gte(col, val)
        elif op == "lte":
            q = q.lte(col, val)
        elif op == "neq":
            q = q.neq(col, val)
        elif op == "is":
            q = q.is_(col, val)  # type: ignore[attr-defined]
        elif op == "not_is":
            q = q.not_.is_(col, val)  # type: ignore[attr-defined]
        else:
            raise ValueError(f"Unsupported op: {op}")
    res = q.execute()
    c = _extract_count(res)
    if c is not None:
        return c
    data = res.data if res else []
    return len(data or [])





