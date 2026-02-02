"""
Plan-based feature enforcement. Features are strictly gated by subscription tier.
Tier order: free (starter) < pro < enterprise.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from fastapi import Depends, HTTPException, status

from .auth_dependencies import CurrentUser, get_current_user
from .supabase_admin import get_supabase_admin

# Tier order for comparison (higher index = higher plan). "starter" normalizes to "free".
TIER_ORDER: tuple[str, ...] = ("free", "pro", "enterprise")
TIER_LEVEL = {t: i for i, t in enumerate(TIER_ORDER)}

# Limits per tier (must match frontend plans.ts and routes_billing SUBSCRIPTION_LIMITS)
SUBSCRIPTION_LIMITS = {
    "free": {"searches": 20, "api_calls": 0, "storage_mb": 1024},
    "starter": {"searches": 20, "api_calls": 0, "storage_mb": 1024},
    "pro": {"searches": 500, "api_calls": 5000, "storage_mb": 25 * 1024},
    "enterprise": {"searches": -1, "api_calls": -1, "storage_mb": -1},
}


def _normalize_tier(tier: str | None) -> str:
    if not tier:
        return "free"
    t = (tier or "").lower().strip()
    if t in SUBSCRIPTION_LIMITS:
        return t
    if t in ("starter", "basic"):
        return "free"
    return "free"


def get_tier_level(tier: str) -> int:
    """Higher = more access. free=0, pro=2, enterprise=3."""
    t = _normalize_tier(tier)
    return TIER_LEVEL.get(t, 0)


def tier_meets(tier: str, required: str) -> bool:
    """True if user's tier has at least the required tier level."""
    return get_tier_level(tier) >= get_tier_level(required)


async def get_user_tier_and_limits(user_id: str, role: str) -> tuple[str, dict]:
    """Returns (tier, limits). Admins get enterprise limits."""
    if role in ("admin", "super_admin"):
        return "enterprise", SUBSCRIPTION_LIMITS["enterprise"]
    supabase = get_supabase_admin()
    sub = (
        supabase.table("subscriptions")
        .select("tier, plan_type")
        .eq("user_id", user_id)
        .eq("status", "active")
        .limit(1)
        .execute()
    )
    tier = "free"
    if sub.data and len(sub.data) > 0:
        row = sub.data[0]
        tier = _normalize_tier(row.get("tier") or row.get("plan_type") or "free")
    limits = SUBSCRIPTION_LIMITS.get(tier, SUBSCRIPTION_LIMITS["free"])
    return tier, limits


async def check_upload_limit(user_id: str, role: str) -> tuple[bool, int, int]:
    """
    Returns (allowed, current_count, limit).
    limit is -1 for unlimited.
    """
    tier, limits = await get_user_tier_and_limits(user_id, role)
    limit = limits.get("searches", 20)
    if limit == -1:
        return True, 0, -1
    supabase = get_supabase_admin()
    now = datetime.utcnow()
    # Count crew_analysis_jobs or part_searches created this month
    try:
        count_result = (
            supabase.table("crew_analysis_jobs")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .gte("created_at", now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat())
            .execute()
        )
        current = getattr(count_result, "count", None) or len(count_result.data or [])
    except Exception:
        try:
            count_result = (
                supabase.table("part_searches")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .gte("created_at", now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat())
                .execute()
            )
            current = getattr(count_result, "count", None) or len(count_result.data or [])
        except Exception:
            current = 0
    allowed = current < limit
    return allowed, current, limit


def require_tier(min_tier: Literal["free", "pro", "enterprise"]):
    """FastAPI dependency: raises 403 if user's subscription tier is below min_tier."""

    async def _require(user: CurrentUser = Depends(get_current_user)):
        tier, _ = await get_user_tier_and_limits(user.id, user.role)
        if not tier_meets(tier, min_tier):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires a {min_tier} plan or higher. Your current plan does not include access.",
            )
        return user

    return _require
