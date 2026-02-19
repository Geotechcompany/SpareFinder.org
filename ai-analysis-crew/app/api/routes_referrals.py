"""Referral / invite reward routes. Award 2 credits to referrer when someone registers via invite link."""

from __future__ import annotations

import logging
import secrets
import string
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from .auth_dependencies import CurrentUser, get_current_user
from .responses import api_error, api_ok
from .supabase_admin import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/referrals", tags=["referrals"])

REFERRAL_CREDITS = 2
REFERRAL_CODE_LENGTH = 8
ALPHABET = string.ascii_uppercase + string.digits


def _generate_referral_code() -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(REFERRAL_CODE_LENGTH))


def _ensure_referral_code(supabase, user_id: str) -> str:
    """Get or create a unique referral_code for the user. Returns the code."""
    try:
        row = (
            supabase.table("profiles")
            .select("referral_code")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if row.data and len(row.data) > 0:
            code = (row.data[0].get("referral_code") or "").strip()
            if code:
                return code
    except Exception as e:
        logger.warning("ensure_referral_code select: %s", e)
    for _ in range(10):
        code = _generate_referral_code()
        try:
            supabase.table("profiles").update({"referral_code": code}).eq("id", user_id).execute()
            return code
        except Exception as e:
            if "unique" in str(e).lower() or "duplicate" in str(e).lower():
                continue
            logger.warning("ensure_referral_code update: %s", e)
            break
    return _generate_referral_code()


def _add_credits_to_user(supabase, user_id: str, amount: int, reason: str) -> bool:
    """Add credits to a user. Tries user_credits table then profiles.credits."""
    try:
        res = supabase.table("user_credits").select("user_id, balance").eq("user_id", user_id).execute()
        if res.data and len(res.data) > 0:
            row = res.data[0]
            before = int(row.get("balance") or 0)
            after = before + amount
            supabase.table("user_credits").update({"balance": after}).eq("user_id", user_id).execute()
            logger.info("Referral: added %s credits to user_credits for %s (reason=%s)", amount, user_id, reason)
            return True
    except Exception as e:
        logger.debug("user_credits add failed: %s", e)
    try:
        prof = supabase.table("profiles").select("credits").eq("id", user_id).limit(1).execute()
        before = int(prof.data[0].get("credits") or 0) if prof.data and len(prof.data) > 0 else 0
        after = before + amount
        supabase.table("profiles").update({"credits": after}).eq("id", user_id).execute()
        logger.info("Referral: added %s credits to profiles for %s (reason=%s)", amount, user_id, reason)
        return True
    except Exception as e:
        logger.exception("Failed to add referral credits: %s", e)
        return False


class ApplyReferralBody(BaseModel):
    code: str = Field(min_length=1, max_length=32)


@router.get("/me")
async def get_my_referral(
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    """Return current user's referral code, invite link, and stats (referred count, credits earned)."""
    try:
        supabase = get_supabase_admin()
        code = _ensure_referral_code(supabase, user.id)
        # Stats: count referrals where referrer_id = user.id, sum credits_awarded
        try:
            refs = (
                supabase.table("referrals")
                .select("id, credits_awarded")
                .eq("referrer_id", user.id)
                .execute()
            )
            referred_count = len(refs.data or [])
            credits_earned = sum((r.get("credits_awarded") or 0) for r in (refs.data or []))
        except Exception:
            referred_count = 0
            credits_earned = 0
        return api_ok(
            data={
                "referral_code": code,
                "referred_count": referred_count,
                "credits_earned": credits_earned,
            }
        )
    except Exception as e:
        logger.exception("get_my_referral: %s", e)
        return api_error("Failed to load referral info", status_code=500)


@router.post("/apply")
async def apply_referral(
    payload: ApplyReferralBody,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Apply a referral code for the current user (the newly registered user).
    Awards 2 credits to the referrer and records the referral. Idempotent: if this user
    already applied a code, returns success without changing anything.
    """
    code = (payload.code or "").strip().upper()
    if not code:
        return api_error("Referral code is required", status_code=400)
    try:
        supabase = get_supabase_admin()
        # Already referred?
        existing = (
            supabase.table("referrals")
            .select("id")
            .eq("referred_id", user.id)
            .limit(1)
            .execute()
        )
        if existing.data and len(existing.data) > 0:
            return api_ok(data={"applied": True, "message": "Referral already applied"})

        # Resolve code to referrer profile
        referrer = (
            supabase.table("profiles")
            .select("id")
            .eq("referral_code", code)
            .limit(1)
            .execute()
        )
        if not referrer.data or len(referrer.data) == 0:
            return api_error("Invalid referral code", status_code=400)
        referrer_id = referrer.data[0]["id"]
        if referrer_id == user.id:
            return api_error("You cannot use your own referral code", status_code=400)

        # Insert referral row and award credits
        supabase.table("referrals").insert(
            {
                "referrer_id": referrer_id,
                "referred_id": user.id,
                "credits_awarded": REFERRAL_CREDITS,
            }
        ).execute()
        ok = _add_credits_to_user(
            supabase,
            referrer_id,
            REFERRAL_CREDITS,
            reason="Invitation reward",
        )
        if not ok:
            logger.warning("Referral applied but credits could not be added for %s", referrer_id)
        return api_ok(
            data={
                "applied": True,
                "credits_awarded_to_referrer": REFERRAL_CREDITS,
            },
            message="Thanks! Your referrer has been awarded 2 credits.",
        )
    except Exception as e:
        logger.exception("apply_referral: %s", e)
        return api_error("Failed to apply referral code", status_code=500)
