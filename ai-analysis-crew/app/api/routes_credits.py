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
        
        if not has_active_plan:
            return {
                "success": True,
                "credits": 0,
                "user_id": user.id,
                "plan_active": False
            }

        # Get user credits from user_credits table
        credits_result = supabase.table("user_credits").select("*").eq("user_id", user.id).execute()
        
        credits = 0
        if credits_result.data and len(credits_result.data) > 0:
            credits = credits_result.data[0].get("balance", 0)

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
