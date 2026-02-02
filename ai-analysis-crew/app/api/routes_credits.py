"""Credits management routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from .auth_dependencies import CurrentUser, get_current_user
from .responses import api_ok
from .supabase_admin import get_supabase_admin

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/balance")
async def get_balance(user: CurrentUser = Depends(get_current_user)):
    """
    Get the current user's credit balance.
    Admins have unlimited credits.
    """
    try:
        # Admins have unlimited credits
        if user.role in ("admin", "super_admin"):
            return {
                "success": True,
                "credits": 999999,  # Large number instead of infinity
                "user_id": user.id,
                "unlimited": True
            }

        supabase = get_supabase_admin()
        
        # Check if user has active subscription
        sub_result = supabase.table("subscriptions").select("*").eq("user_id", user.id).eq("status", "active").execute()
        
        has_active_plan = sub_result.data and len(sub_result.data) > 0
        subscription = sub_result.data[0] if has_active_plan and sub_result.data else None
        tier = (subscription.get("tier") or subscription.get("plan_type") or "free").lower() if subscription else "free"

        if not has_active_plan:
            return {
                "success": True,
                "credits": 0,
                "user_id": user.id,
                "plan_active": False
            }

        # Get credits: try user_credits.balance, then profiles.credits
        credits = 0
        try:
            credits_result = supabase.table("user_credits").select("*").eq("user_id", user.id).execute()
            if credits_result.data and len(credits_result.data) > 0:
                credits = credits_result.data[0].get("balance", 0) or 0
        except Exception:
            pass
        if credits <= 0:
            try:
                prof = supabase.table("profiles").select("credits").eq("id", user.id).limit(1).execute()
                if prof.data and len(prof.data) > 0 and (prof.data[0].get("credits") or 0) > 0:
                    credits = int(prof.data[0]["credits"])
            except Exception:
                pass

        # Paid plan but no credits yet: return tier-based default so UI doesn't show "Upgrade plan"
        if credits <= 0:
            # Starter/Basic (e.g. £12.99) = 20 credits; Pro = 100; Enterprise = unlimited
            if tier == "enterprise":
                credits = 999999
                return {
                    "success": True,
                    "credits": credits,
                    "user_id": user.id,
                    "plan_active": True,
                    "unlimited": True,
                }
            if tier == "pro":
                credits = 100
            else:
                # starter, basic, free (any active paid plan)
                credits = 20
            return {
                "success": True,
                "credits": credits,
                "user_id": user.id,
                "plan_active": True,
            }

        return {
            "success": True,
            "credits": credits,
            "user_id": user.id,
            "plan_active": True
        }

    except Exception as e:
        print(f"❌ Error fetching credits balance: {e}")
        return {
            "success": True,
            "credits": 0,
            "user_id": user.id,
            "plan_active": False
        }
