"""User profile routes (aliases for frontend compatibility)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, Request
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

        # Enrich preferences with dedicated region columns for easy retrieval (columns take precedence)
        prefs = _safe_dict(profile.get("preferences"))
        if "use_regional_suppliers" in profile:
            prefs["useRegionalSuppliers"] = bool(profile.get("use_regional_suppliers"))
        if "user_country" in profile:
            prefs["userCountry"] = (profile.get("user_country") or "").strip()
        if "user_region" in profile:
            prefs["userRegion"] = (profile.get("user_region") or "").strip()
        profile["preferences"] = prefs

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
            # Sync region preference to dedicated columns for easy retrieval
            merged_prefs = updates["preferences"]
            updates["use_regional_suppliers"] = bool(merged_prefs.get("useRegionalSuppliers"))
            updates["user_country"] = (merged_prefs.get("userCountry") or "").strip() or None
            updates["user_region"] = (merged_prefs.get("userRegion") or "").strip() or None

        updates["updated_at"] = datetime.utcnow().isoformat()

        # Update (SyncFilterRequestBuilder has no .select(); do update then fetch)
        await run_in_threadpool(
            lambda: supabase.table("profiles").update(updates).eq("id", user.id).execute()
        )
        res = await run_in_threadpool(
            lambda: supabase.table("profiles").select("*").eq("id", user.id).single().execute()
        )
        profile = res.data if res and res.data else None
        if not profile:
            return api_error("Failed to update profile", status_code=500)

        # Enrich preferences with dedicated region columns (same as GET) so frontend always gets region
        prefs = _safe_dict(profile.get("preferences"))
        if "use_regional_suppliers" in profile:
            prefs["useRegionalSuppliers"] = bool(profile.get("use_regional_suppliers"))
        if "user_country" in profile:
            prefs["userCountry"] = (profile.get("user_country") or "").strip()
        if "user_region" in profile:
            prefs["userRegion"] = (profile.get("user_region") or "").strip()
        profile["preferences"] = prefs

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


@router.get("/region-preference")
async def get_region_preference(user: CurrentUser = Depends(get_current_user)):
    """
    Return the current user's region preference for supplier results.
    Uses dedicated columns (use_regional_suppliers, user_country, user_region) with
    fallback to preferences JSON for existing rows that have not been re-saved.
    """
    try:
        supabase = get_supabase_admin()
        res = await run_in_threadpool(
            lambda: supabase.table("profiles")
            .select("use_regional_suppliers, user_country, user_region, preferences")
            .eq("id", user.id)
            .single()
            .execute()
        )
        row = res.data if res and res.data else None
        if not row:
            return api_ok(useRegionalSuppliers=False, userCountry="", userRegion="")

        # Prefer dedicated columns; fallback to preferences for backward compatibility
        prefs = _safe_dict(row.get("preferences"))
        use_regional = row.get("use_regional_suppliers")
        if use_regional is None:
            use_regional = bool(prefs.get("useRegionalSuppliers"))
        country = row.get("user_country")
        if country is None:
            country = prefs.get("userCountry") or ""
        region = row.get("user_region")
        if region is None:
            region = prefs.get("userRegion") or ""

        return api_ok(
            useRegionalSuppliers=bool(use_regional),
            userCountry=(country or "").strip(),
            userRegion=(region or "").strip(),
        )
    except Exception as e:
        print(f"❌ Error fetching region preference: {e}")
        return api_error("Failed to fetch region preference", status_code=500)


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


@router.get("/detect-region")
async def detect_region(request: Request, user: CurrentUser = Depends(get_current_user)):
    """
    Detect user's country/region from request IP. Returns country, region, ip, and currency for UI display.
    """
    try:
        forwarded = request.headers.get("x-forwarded-for")
        client_host = forwarded.split(",")[0].strip() if forwarded else request.client.host if request.client else None
        if not client_host or client_host in ("127.0.0.1", "localhost", "::1"):
            return api_ok(country="", region="", ip="", currency="", message="Local request; no region detected")
        import urllib.request
        import json
        url = f"https://ipapi.co/{client_host}/json/"
        req = urllib.request.Request(url, headers={"User-Agent": "SpareFinder/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        country = (data.get("country_name") or "").strip()
        region = (data.get("region") or "").strip()
        ip = (data.get("ip") or client_host or "").strip()
        currency = (data.get("currency_code") or data.get("currency") or "").strip()
        return api_ok(country=country, region=region, ip=ip, currency=currency)
    except Exception as e:
        print(f"⚠️ detect-region failed: {e}")
        return api_ok(country="", region="", ip="", currency="", message="Could not detect region")




