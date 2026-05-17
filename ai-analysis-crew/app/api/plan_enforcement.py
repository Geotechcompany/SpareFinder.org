"""
Plan-based feature enforcement. Features are strictly gated by subscription tier.
Tier order: free (starter) < pro < enterprise.

- Upload/analysis limits are shared across all workspaces on the account.
- Workspace count limits: Starter 3, Pro 5, Enterprise unlimited.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from fastapi import Depends, HTTPException, status

from .auth_dependencies import CurrentUser, get_current_user
from .supabase_admin import get_supabase_admin
from .workspace_dependencies import (
    WorkspaceScope,
    get_workspace_scope,
    workspace_isolation_enabled,
)

TIER_ORDER: tuple[str, ...] = ("free", "pro", "enterprise")
TIER_LEVEL = {t: i for i, t in enumerate(TIER_ORDER)}

SUBSCRIPTION_LIMITS = {
    "free": {"searches": 20, "api_calls": 0, "storage_mb": 1024},
    "starter": {"searches": 20, "api_calls": 0, "storage_mb": 1024},
    "pro": {"searches": 500, "api_calls": 5000, "storage_mb": 25 * 1024},
    "enterprise": {"searches": -1, "api_calls": -1, "storage_mb": -1},
}

# Max workspaces the billing user may own (shared plan pool for analyses).
WORKSPACE_LIMITS_BY_TIER: dict[str, int] = {
    "free": 3,
    "starter": 3,
    "pro": 5,
    "enterprise": -1,
}


def _normalize_tier(tier: str | None) -> str:
    if not tier:
        return "free"
    t = (tier or "").lower().strip()
    if t in SUBSCRIPTION_LIMITS:
        return t
    if t in ("starter", "basic"):
        return "free"
    if t in ("professional", "business"):
        return "pro"
    return "free"


def get_tier_level(tier: str) -> int:
    t = _normalize_tier(tier)
    return TIER_LEVEL.get(t, 0)


def tier_meets(tier: str, required: str) -> bool:
    return get_tier_level(tier) >= get_tier_level(required)


def get_max_workspaces_for_tier(tier: str) -> int:
    """-1 means unlimited workspaces."""
    t = _normalize_tier(tier)
    return WORKSPACE_LIMITS_BY_TIER.get(t, WORKSPACE_LIMITS_BY_TIER["free"])


def plan_display_name(tier: str) -> str:
    t = _normalize_tier(tier)
    if t == "enterprise":
        return "Enterprise"
    if t == "pro":
        return "Professional"
    return "Starter"


async def get_user_tier_and_limits(user_id: str, role: str) -> tuple[str, dict]:
    """Billing tier and limits for the account (shared across all workspaces)."""
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
    if sub.data:
        row = sub.data[0]
        tier = _normalize_tier(row.get("tier") or row.get("plan_type") or "free")
    limits = SUBSCRIPTION_LIMITS.get(tier, SUBSCRIPTION_LIMITS["free"])
    return tier, limits


async def count_user_workspaces(user_id: str) -> int:
    supabase = get_supabase_admin()
    res = (
        supabase.table("workspace_members")
        .select("workspace_id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    return int(getattr(res, "count", None) or len(res.data or []))


async def get_user_workspace_ids(user_id: str) -> list[str]:
    supabase = get_supabase_admin()
    res = (
        supabase.table("workspace_members")
        .select("workspace_id")
        .eq("user_id", user_id)
        .execute()
    )
    ids: list[str] = []
    for row in res.data or []:
        wid = str(row.get("workspace_id") or "").strip()
        if wid and wid not in ids:
            ids.append(wid)
    return ids


def _shared_usage_or_filter(user_id: str, workspace_ids: list[str]) -> str:
    """PostgREST OR filter: jobs in any member workspace or legacy user rows."""
    if not workspace_ids:
        return f"user_id.eq.{user_id}"
    in_list = ",".join(workspace_ids)
    return f"workspace_id.in.({in_list}),and(workspace_id.is.null,user_id.eq.{user_id})"


async def count_shared_monthly_uploads(user_id: str) -> int:
    """Count analyses this month across all workspaces (shared plan limit)."""
    supabase = get_supabase_admin()
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    workspace_ids = await get_user_workspace_ids(user_id)
    use_workspace_filter = workspace_isolation_enabled()

    def _monthly_count_query(table: str):
        q = (
            supabase.table(table)
            .select("id", count="exact")
            .gte("created_at", month_start)
        )
        if use_workspace_filter:
            return q.or_(_shared_usage_or_filter(user_id, workspace_ids))
        return q.eq("user_id", user_id)

    try:
        count_result = _monthly_count_query("crew_analysis_jobs").execute()
        return int(getattr(count_result, "count", None) or len(count_result.data or []))
    except Exception:
        try:
            count_result = _monthly_count_query("part_searches").execute()
            return int(getattr(count_result, "count", None) or len(count_result.data or []))
        except Exception:
            return 0


async def get_workspace_quota(user_id: str, role: str) -> dict[str, Any]:
    tier, limits = await get_user_tier_and_limits(user_id, role)
    max_ws = get_max_workspaces_for_tier(tier)
    count = await count_user_workspaces(user_id)
    can_create = role in ("admin", "super_admin") or max_ws == -1 or count < max_ws
    return {
        "tier": tier,
        "planName": plan_display_name(tier),
        "maxWorkspaces": max_ws,
        "workspaceCount": count,
        "canCreateWorkspace": can_create,
        "sharedPlanLimits": True,
        "monthlyAnalysisLimit": limits.get("searches", 20),
    }


async def assert_can_create_workspace(user: CurrentUser) -> str | None:
    """Return an error message if the user cannot create another workspace."""
    if user.role in ("admin", "super_admin"):
        return None
    tier, _ = await get_user_tier_and_limits(user.id, user.role)
    max_ws = get_max_workspaces_for_tier(tier)
    if max_ws == -1:
        return None
    count = await count_user_workspaces(user.id)
    if count >= max_ws:
        plan = plan_display_name(tier)
        return (
            f"Your {plan} plan allows up to {max_ws} workspaces. "
            f"Upgrade your plan to create more."
        )
    return None


async def check_upload_limit(
    scope: WorkspaceScope,
    role: str,
) -> tuple[bool, int, int]:
    """
    Returns (allowed, current_count, limit).
    Limits are shared across all workspaces on the account.
    """
    tier, limits = await get_user_tier_and_limits(scope.user_id, role)
    limit = limits.get("searches", 20)
    if limit == -1:
        return True, 0, -1
    current = await count_shared_monthly_uploads(scope.user_id)
    allowed = current < limit
    return allowed, current, limit


def require_tier(min_tier: Literal["free", "pro", "enterprise"]):
    async def _require(
        scope: WorkspaceScope = Depends(get_workspace_scope),
        user: CurrentUser = Depends(get_current_user),
    ):
        tier, _ = await get_user_tier_and_limits(user.id, user.role)
        if not tier_meets(tier, min_tier):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires a {min_tier} plan or higher. Your current plan does not include access.",
            )
        return scope

    return _require
