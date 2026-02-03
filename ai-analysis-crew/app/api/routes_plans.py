"""Public plans API - used by landing and billing to fetch pricing plans from DB."""

from __future__ import annotations

from fastapi import APIRouter

from .responses import api_ok
from .supabase_admin import get_supabase_admin

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("", name="list_plans")
@router.get("/", name="list_plans_slash")
async def list_plans():
    """
    List active pricing plans (no auth required).
    Used by landing page and billing to display plans from DB.
    Returns empty list if table missing or error; frontend should fall back to static config.
    """
    try:
        supabase = get_supabase_admin()
        result = (
            supabase.table("plans")
            .select("*")
            .eq("active", True)
            .order("display_order")
            .execute()
        )
        rows = result.data or []
        # Map to frontend-friendly shape (limits in same shape as plans.ts)
        plans = []
        for r in rows:
            searches = r.get("limits_searches")
            api_calls = r.get("limits_api_calls", 0)
            storage_mb = r.get("limits_storage_mb", 1024)
            # -1 means unlimited (storage in bytes for frontend)
            if storage_mb is not None and storage_mb < 0:
                storage_bytes = -1
            else:
                storage_bytes = (int(storage_mb or 1024) * 1024 * 1024) if storage_mb else (1024 * 1024 * 1024)
            plans.append({
                "id": r.get("id"),
                "tier": r.get("tier"),
                "name": r.get("name"),
                "price": float(r.get("price") or 0),
                "currency": r.get("currency") or "GBP",
                "period": r.get("period") or "month",
                "description": r.get("description") or "",
                "features": r.get("features") or [],
                "popular": bool(r.get("popular")),
                "color": r.get("color") or "",
                "limits": {
                    "searches": searches if searches is not None else 20,
                    "api_calls": api_calls if api_calls is not None else 0,
                    "storage": storage_bytes,
                },
                "trial": None,
            })
            if r.get("trial_days") is not None:
                plans[-1]["trial"] = {
                    "days": r["trial_days"],
                    "trialPrice": float(r["trial_price"]) if r.get("trial_price") is not None else None,
                }
        return api_ok(data={"plans": plans})
    except Exception:
        return api_ok(data={"plans": []})
