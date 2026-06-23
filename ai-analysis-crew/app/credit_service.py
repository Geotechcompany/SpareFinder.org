"""Pay-as-you-go analysis credits (profiles.credits / user_credits.balance)."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

CREDIT_COST_ANALYSIS = 1


def _read_balance_from_user_credits(supabase: Any, user_id: str) -> int | None:
    try:
        res = supabase.table("user_credits").select("balance").eq("user_id", user_id).limit(1).execute()
        if res.data and len(res.data) > 0:
            return int(res.data[0].get("balance") or 0)
    except Exception as exc:
        logger.debug("user_credits read failed for %s: %s", user_id, exc)
    return None


def _read_balance_from_profiles(supabase: Any, user_id: str) -> int:
    try:
        res = supabase.table("profiles").select("credits").eq("id", user_id).limit(1).execute()
        if res.data and len(res.data) > 0:
            return int(res.data[0].get("credits") or 0)
    except Exception as exc:
        logger.debug("profiles.credits read failed for %s: %s", user_id, exc)
    return 0


def get_user_credit_balance(supabase: Any, user_id: str) -> int:
    """Return stored credit balance (user_credits row wins when present)."""
    user_credits_balance = _read_balance_from_user_credits(supabase, user_id)
    if user_credits_balance is not None:
        return max(0, user_credits_balance)
    return max(0, _read_balance_from_profiles(supabase, user_id))


def _write_balance(supabase: Any, user_id: str, balance: int) -> None:
    balance = max(0, int(balance))
    wrote = False
    try:
        res = supabase.table("user_credits").select("user_id").eq("user_id", user_id).limit(1).execute()
        if res.data and len(res.data) > 0:
            supabase.table("user_credits").update({"balance": balance}).eq("user_id", user_id).execute()
            wrote = True
    except Exception as exc:
        logger.debug("user_credits write failed for %s: %s", user_id, exc)
    if not wrote:
        supabase.table("profiles").update({"credits": balance}).eq("id", user_id).execute()


def _log_transaction(
    supabase: Any,
    *,
    user_id: str,
    transaction_type: str,
    amount: int,
    credits_before: int,
    credits_after: int,
    reason: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    try:
        supabase.table("credit_transactions").insert(
            {
                "user_id": user_id,
                "transaction_type": transaction_type,
                "amount": amount,
                "credits_before": credits_before,
                "credits_after": credits_after,
                "reason": reason,
                "metadata": metadata or {},
            }
        ).execute()
    except Exception as exc:
        logger.debug("credit_transactions insert skipped: %s", exc)


def should_skip_credit_charge(*, role: str | None, tier: str | None) -> bool:
    if (role or "").lower() in ("admin", "super_admin"):
        return True
    if (tier or "").lower() == "enterprise":
        return True
    return False


def deduct_credits(
    supabase: Any,
    user_id: str,
    amount: int,
    *,
    reason: str,
    metadata: dict[str, Any] | None = None,
) -> tuple[bool, int, str | None]:
    """Deduct credits atomically (best-effort). Returns (ok, balance_after, error)."""
    amount = int(amount)
    if amount <= 0:
        return True, get_user_credit_balance(supabase, user_id), None

    before = get_user_credit_balance(supabase, user_id)
    if before < amount:
        return False, before, "insufficient_credits"

    after = before - amount
    try:
        _write_balance(supabase, user_id, after)
        _log_transaction(
            supabase,
            user_id=user_id,
            transaction_type="deduct",
            amount=amount,
            credits_before=before,
            credits_after=after,
            reason=reason,
            metadata=metadata,
        )
        return True, after, None
    except Exception as exc:
        logger.exception("deduct_credits failed for %s: %s", user_id, exc)
        return False, before, "credit_deduction_failed"


def add_credits(
    supabase: Any,
    user_id: str,
    amount: int,
    *,
    reason: str,
    metadata: dict[str, Any] | None = None,
) -> int:
    """Add credits back (refund/grant). Returns balance after."""
    amount = int(amount)
    if amount <= 0:
        return get_user_credit_balance(supabase, user_id)

    before = get_user_credit_balance(supabase, user_id)
    after = before + amount
    _write_balance(supabase, user_id, after)
    _log_transaction(
        supabase,
        user_id=user_id,
        transaction_type="add",
        amount=amount,
        credits_before=before,
        credits_after=after,
        reason=reason,
        metadata=metadata,
    )
    return after


def refund_analysis_credit(
    supabase: Any,
    user_id: str,
    *,
    job_id: str,
    reason: str = "Analysis failed — credit refunded",
) -> bool:
    """Refund one analysis credit once per job_id (best-effort idempotency)."""
    meta = {"job_id": job_id, "kind": "analysis_refund"}
    try:
        existing = (
            supabase.table("credit_transactions")
            .select("id")
            .eq("user_id", user_id)
            .eq("transaction_type", "add")
            .contains("metadata", meta)
            .limit(1)
            .execute()
        )
        if existing.data:
            return False
    except Exception:
        pass

    add_credits(
        supabase,
        user_id,
        CREDIT_COST_ANALYSIS,
        reason=reason,
        metadata=meta,
    )
    logger.info("Refunded analysis credit for user %s job %s", user_id, job_id)
    return True


def charge_analysis_credit(
    supabase: Any,
    user_id: str,
    *,
    job_id: str,
    role: str | None,
    tier: str | None,
) -> tuple[bool, int, str | None, bool]:
    """
    Charge one credit for an analysis.
    Returns (ok, balance_after, error_code, skipped_unlimited).
    """
    if should_skip_credit_charge(role=role, tier=tier):
        return True, get_user_credit_balance(supabase, user_id), None, True

    ok, balance, err = deduct_credits(
        supabase,
        user_id,
        CREDIT_COST_ANALYSIS,
        reason="Image analysis",
        metadata={"job_id": job_id, "kind": "analysis_charge"},
    )
    return ok, balance, err, False
