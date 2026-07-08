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

# Canonical free-trial length per tier (matches src/lib/plans.ts).
CANONICAL_TRIAL_DAYS_BY_TIER: dict[str, int] = {
    "free": 7,
    "pro": 3,
}


def canonical_trial_days_for_tier(tier: str | None) -> int:
    """Return allowed trial days for a tier (0 when no trial)."""
    normalized = _normalize_tier(tier)
    return CANONICAL_TRIAL_DAYS_BY_TIER.get(normalized, 0)


def canonical_trial_days_for_plan_name(plan_name: str | None) -> int:
    """Map checkout plan label to canonical trial days."""
    if not plan_name:
        return 0
    normalized = plan_name.lower()
    if "enterprise" in normalized:
        return 0
    if "pro" in normalized or "professional" in normalized or "business" in normalized:
        return CANONICAL_TRIAL_DAYS_BY_TIER["pro"]
    if "starter" in normalized or "basic" in normalized or "free" in normalized:
        return CANONICAL_TRIAL_DAYS_BY_TIER["free"]
    return 0


def _plan_name_to_tier_guess(plan_name: str | None) -> str:
    if not plan_name:
        return "free"
    normalized = plan_name.lower()
    if "enterprise" in normalized:
        return "enterprise"
    if "pro" in normalized or "professional" in normalized or "business" in normalized:
        return "pro"
    return "free"


def resolve_trial_days_for_plan(supabase, plan_name: str) -> int:
    """
    Trial length for checkout: admin `plans.trial_days` when set, else canonical defaults.
    """
    normalized_name = (plan_name or "").strip().lower()
    tier_guess = _plan_name_to_tier_guess(plan_name)
    try:
        result = supabase.table("plans").select("tier,name,trial_days").execute()
        rows = result.data or []
        for row in rows:
            row_name = (row.get("name") or "").strip().lower()
            row_tier = _normalize_tier(row.get("tier"))
            name_match = (
                bool(normalized_name)
                and (row_name == normalized_name or normalized_name in row_name or row_name in normalized_name)
            )
            tier_match = row_tier == tier_guess
            if not name_match and not tier_match:
                continue
            raw_days = row.get("trial_days")
            if raw_days is not None:
                try:
                    return max(0, int(raw_days))
                except (TypeError, ValueError):
                    pass
            return canonical_trial_days_for_tier(row_tier)
    except Exception as e:
        print(f"⚠️ resolve_trial_days_for_plan failed: {e}")
    return canonical_trial_days_for_plan_name(plan_name)


# Legacy plans.trial_days before Starter 7d / Pro 3d policy.
LEGACY_TRIAL_DAYS_BY_TIER: dict[str, int] = {
    "free": 30,
    "pro": 7,
}


def trial_days_for_plan_row(tier: str | None, trial_days: int | None) -> int:
    """Public plans API: admin DB override when set, else canonical default."""
    normalized = _normalize_tier(tier)
    canonical = canonical_trial_days_for_tier(normalized)
    if trial_days is not None:
        try:
            stored = max(0, int(trial_days))
            legacy = LEGACY_TRIAL_DAYS_BY_TIER.get(normalized)
            if stored > 0 and legacy is not None and stored == legacy:
                return canonical
            return stored
        except (TypeError, ValueError):
            pass
    return canonical


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


async def _fetch_user_subscription_row(user_id: str) -> dict | None:
    """Active or trialing subscription (matches frontend isPlanActive)."""
    from .subscription_utils import ACTIVE_STATUSES, pick_best_subscription_row

    supabase = get_supabase_admin()
    sub = (
        supabase.table("subscriptions")
        .select("tier, plan_type, status, current_period_end, updated_at")
        .eq("user_id", user_id)
        .execute()
    )
    row = pick_best_subscription_row(sub.data or [])
    if not row:
        return None
    status = str(row.get("status") or "").lower()
    if status not in ACTIVE_STATUSES:
        return None
    return row


async def user_has_active_plan(user_id: str, role: str) -> bool:
    if role in ("admin", "super_admin"):
        return True
    return (await _fetch_user_subscription_row(user_id)) is not None


async def get_profile_role(user_id: str) -> str:
    supabase = get_supabase_admin()
    res = (
        supabase.table("profiles")
        .select("role")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if res.data:
        return str(res.data[0].get("role") or "user")
    return "user"


async def get_workspace_owner_user_id(workspace_id: str) -> str | None:
    """Billing account for a workspace is the member with role=owner."""
    supabase = get_supabase_admin()
    res = (
        supabase.table("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace_id)
        .eq("role", "owner")
        .limit(1)
        .execute()
    )
    if res.data:
        return str(res.data[0]["user_id"])
    ws = (
        supabase.table("workspaces")
        .select("created_by")
        .eq("id", workspace_id)
        .limit(1)
        .execute()
    )
    if ws.data:
        created_by = ws.data[0].get("created_by")
        if created_by:
            return str(created_by)
    return None


async def resolve_billing_user_id(
    user_id: str,
    role: str,
    workspace_id: str | None,
) -> tuple[str, str]:
    """
    Return (billing_user_id, plan_source).
    Members/admins without their own plan inherit the workspace owner's subscription.
    """
    if role in ("admin", "super_admin"):
        return user_id, "self"
    if await user_has_active_plan(user_id, role):
        return user_id, "self"
    if workspace_id:
        owner_id = await get_workspace_owner_user_id(workspace_id)
        if owner_id and owner_id != user_id:
            owner_role = await get_profile_role(owner_id)
            if await user_has_active_plan(owner_id, owner_role):
                return owner_id, "workspace_owner"
    return user_id, "self"


async def get_user_tier_and_limits(user_id: str, role: str) -> tuple[str, dict]:
    """Billing tier and limits for the account (shared across all workspaces)."""
    if role in ("admin", "super_admin"):
        return "enterprise", SUBSCRIPTION_LIMITS["enterprise"]
    row = await _fetch_user_subscription_row(user_id)
    tier = "free"
    if row:
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
    has_plan = role in ("admin", "super_admin") or await user_has_active_plan(
        user_id, role
    )
    under_limit = role in ("admin", "super_admin") or max_ws == -1 or count < max_ws
    can_create = has_plan and under_limit
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
    count = await count_user_workspaces(user.id)
    # First workspace (onboarding) does not require a paid plan yet.
    if count == 0:
        return None
    if not await user_has_active_plan(user.id, user.role):
        return (
            "An active subscription is required to create workspaces. "
            "Choose a plan on the billing page to continue."
        )
    tier, _ = await get_user_tier_and_limits(user.id, user.role)
    max_ws = get_max_workspaces_for_tier(tier)
    if max_ws == -1:
        return None
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
    Limits are shared across all workspaces on the billing account.
    """
    billing_user_id = getattr(scope, "billing_user_id", None) or scope.user_id
    billing_role = role
    if billing_user_id != scope.user_id:
        billing_role = await get_profile_role(billing_user_id)
    tier, limits = await get_user_tier_and_limits(billing_user_id, billing_role)
    limit = limits.get("searches", 20)
    if limit == -1:
        return True, 0, -1
    current = await count_shared_monthly_uploads(billing_user_id)
    allowed = current < limit
    return allowed, current, limit


def require_tier(min_tier: Literal["free", "pro", "enterprise"]):
    async def _require(
        scope: WorkspaceScope = Depends(get_workspace_scope),
        user: CurrentUser = Depends(get_current_user),
    ):
        billing_user_id = getattr(scope, "billing_user_id", None) or user.id
        billing_role = user.role
        if billing_user_id != user.id:
            billing_role = await get_profile_role(billing_user_id)
        tier, _ = await get_user_tier_and_limits(billing_user_id, billing_role)
        if not tier_meets(tier, min_tier):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires a {min_tier} plan or higher. Your current plan does not include access.",
            )
        return scope

    return _require
