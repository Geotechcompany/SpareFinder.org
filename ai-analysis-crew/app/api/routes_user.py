"""User profile routes (aliases for frontend compatibility)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends
from starlette.concurrency import run_in_threadpool

from .auth_dependencies import CurrentUser, get_current_user
from .responses import api_error, api_ok
from .supabase_admin import get_supabase_admin

router = APIRouter(prefix="/user", tags=["user"])


def _safe_dict(v: Any) -> dict[str, Any]:
    return v if isinstance(v, dict) else {}


@router.get("/profile")
async def get_user_profile(user: CurrentUser = Depends(get_current_user)):
    """
    Return the current user's profile.

    Frontend expects `profileResponse.data.profile`, so we return `profile` at the
    top level (alongside `success`), not nested under `data`.
    """
    try:
        supabase = get_supabase_admin()

        res = await run_in_threadpool(
            lambda: supabase.table("profiles").select("*").eq("id", user.id).single().execute()
        )
        profile = res.data if res and res.data else None
        if not profile:
            return api_error("User profile not found", status_code=404)

        return api_ok(profile=profile)
    except Exception as e:
        print(f"❌ Error fetching user profile: {e}")
        return api_error("Failed to fetch user profile", status_code=500)


@router.put("/profile")
async def update_user_profile(payload: dict[str, Any], user: CurrentUser = Depends(get_current_user)):
    """
    Update the current user's profile.

    - Supports partial updates.
    - Merges `preferences` dict (and `preferences.onboarding`) instead of overwriting blindly.
    - Returns `success` + `profile` at top level for compatibility with Settings/Onboarding pages.
    """
    try:
        supabase = get_supabase_admin()

        allowed_fields = {
            "full_name",
            "company",
            "phone",
            "bio",
            "location",
            "website",
            "avatar_url",
            "preferences",
        }

        updates: dict[str, Any] = {k: v for k, v in (payload or {}).items() if k in allowed_fields}
        if not updates:
            # Nothing to update; just return current.
            return await get_user_profile(user)

        # Merge preferences (deep-ish for onboarding)
        if "preferences" in updates:
            # Fetch current preferences
            current = await run_in_threadpool(
                lambda: supabase.table("profiles").select("preferences").eq("id", user.id).single().execute()
            )
            current_prefs = _safe_dict((current.data or {}).get("preferences"))
            next_prefs = _safe_dict(updates.get("preferences"))

            # Merge onboarding sub-dict if present
            if "onboarding" in next_prefs:
                current_onboarding = _safe_dict(current_prefs.get("onboarding"))
                next_onboarding = _safe_dict(next_prefs.get("onboarding"))
                merged_onboarding = {**current_onboarding, **next_onboarding}
                next_prefs = {**next_prefs, "onboarding": merged_onboarding}

            updates["preferences"] = {**current_prefs, **next_prefs}

        updates["updated_at"] = datetime.utcnow().isoformat()

        res = await run_in_threadpool(
            lambda: (
                supabase.table("profiles")
                .update(updates)
                .eq("id", user.id)
                .select("*")
                .single()
                .execute()
            )
        )
        profile = res.data if res and res.data else None
        if not profile:
            return api_error("Failed to update profile", status_code=500)

        # Invalidate current-user cache so next /auth/current-user gets fresh profile
        try:
            from ..redis_client import is_redis_configured, cache_delete
            if is_redis_configured():
                cache_delete(f"user:id:{user.id}")
                if user.clerk_user_id:
                    cache_delete(f"user:clerk:{user.clerk_user_id}")
        except Exception:
            pass

        return api_ok(profile=profile)
    except Exception as e:
        print(f"❌ Error updating user profile: {e}")
        return api_error("Failed to update user profile", status_code=500)


@router.post("/onboarding-survey")
async def submit_onboarding_survey(
    payload: dict[str, Any], user: CurrentUser = Depends(get_current_user)
):
    """
    Persist onboarding survey data for admin analytics.
    Frontend calls this best-effort after saving preferences.
    """
    try:
        supabase = get_supabase_admin()

        record = {
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "company": payload.get("company"),
            "role": payload.get("role"),
            "company_size": payload.get("companySize"),
            "primary_goal": payload.get("primaryGoal"),
            "interests": payload.get("interests"),
            "referral_source": payload.get("referralSource"),
            "referral_source_other": payload.get("referralSourceOther"),
            "created_at": datetime.utcnow().isoformat(),
        }

        await run_in_threadpool(lambda: supabase.table("onboarding_surveys").insert(record).execute())
        return api_ok(message="Onboarding survey submitted")
    except Exception as e:
        # Do not fail the main onboarding flow on analytics insert failures.
        print(f"⚠️ Onboarding survey insert failed: {e}")
        return api_ok(message="Onboarding survey skipped")




